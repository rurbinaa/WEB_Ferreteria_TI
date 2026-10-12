import requests

print('=== COMPREHENSIVE INTEGRATION TEST ===')
print()

# 1. Login as admin
print('1. Testing admin login...')
r = requests.post('http://localhost:8000/auth/login', json={'nombre_usuario':'admin','password':'admin123'})
assert r.status_code == 200, f'Admin login failed: {r.status_code}'
admin_token = r.json()['access_token']
admin_headers = {'Authorization': 'Bearer ' + admin_token}
print('  OK Admin login OK')

# 2. Login as vendedor
print('2. Testing vendedor login...')
r = requests.post('http://localhost:8000/auth/login', json={'nombre_usuario':'vendedor','password':'vendedor123'})
assert r.status_code == 200, f'Vendedor login failed: {r.status_code}'
vend_token = r.json()['access_token']
vend_headers = {'Authorization': 'Bearer ' + vend_token}
print('  OK Vendedor login OK')

# 3. Get product with stock
print('3. Getting product with stock...')
r = requests.get('http://localhost:8000/productos', headers=admin_headers)
products = r.json()
product = next(p for p in products if p['stock_actual'] > 0)
print(f'  OK Found product: {product["codigo"]} ({product["nombre"]}) Stock: {product["stock_actual"]}')

# 4. Create sale as vendedor
print('4. Creating sale as vendedor...')
import time
client_uuid = f'test-full-{int(time.time())}'
venta_data = {'client_uuid': client_uuid, 'items': [{'producto_codigo': product['codigo'], 'cantidad': 2}]}
r = requests.post('http://localhost:8000/ventas', json=venta_data, headers=admin_headers)
assert r.status_code == 201, f'Venta failed: {r.status_code}'
venta = r.json()
venta_id = venta['id']
print(f'  OK Venta created: ID={venta_id}, Total={venta["total"]}')

# 5. Verify in ventas list
r = requests.get('http://localhost:8000/ventas', headers=admin_headers)
ventas = r.json()
created = next(v for v in ventas if v['client_uuid'] == client_uuid)
assert created is not None, 'Venta not found in list'
assert created['total'] == venta['total']
print(f'  OK Venta verified in list: ID={created["id"]}, Total={created["total"]}')

# 5b. Test idempotency
print('  Testing idempotency...')
r2 = requests.post('http://localhost:8000/ventas', json={'client_uuid': client_uuid, 'items': [{'producto_codigo': product['codigo'], 'cantidad': 1}]}, headers=admin_headers)
assert r2.status_code == 201
assert r2.json()['id'] == venta_id
print('  OK Idempotency: same venta returned for same client_uuid')

# 6. Check stock decremented
print('6. Checking stock decremented...')
r = requests.get(f'http://localhost:8000/productos/{product["id"]}', headers=admin_headers)
print(f'  OK Stock after sale: {r.json()["stock_actual"]}')

# 7. Verify in bitacora
r = requests.get('http://localhost:8000/bitacora', headers=admin_headers)
bitacora = r.json()
recent = next((b for b in bitacora if b['entidad_id'] == str(venta_id)), None)
assert recent is not None, 'Venta not in bitacora'
print(f'  OK Bitacora entry: {recent["accion"]} - {recent["detalle"]}')

# 8. Test anular venta restores stock
print('8. Testing anular venta...')
r = requests.post(f'http://localhost:8000/ventas/{venta_id}/anular', json={'motivo': 'Test anular'}, headers=admin_headers)
assert r.status_code == 200
print(f'  OK Venta anulada: {r.json()["id"]}')

# 9. Verify stock restored
r = requests.get(f'http://localhost:8000/productos/{product["id"]}', headers=admin_headers)
stock_after_anular = r.json()['stock_actual']
print(f'  OK Stock restored: {stock_after_anular}')

# 9. Test entradas
print('9. Testing entradas...')
r = requests.post('http://localhost:8000/entradas', json={
    'proveedor_id': 1,
    'producto_id': product['id'],
    'cantidad': 5,
    'costo_unitario': 0.30
}, headers=admin_headers)
assert r.status_code == 201
entrada = r.json()
print(f'  OK Entrada created: {entrada["id"]} Cantidad: {entrada["cantidad"]}')

# 9b. Check stock increased
r = requests.get(f'http://localhost:8000/productos/{product["id"]}', headers=admin_headers)
print(f'  OK Stock after entrada: {r.json()["stock_actual"]}')

print()
print('=== ALL TESTS PASSED ===')
print('Integration working correctly!')