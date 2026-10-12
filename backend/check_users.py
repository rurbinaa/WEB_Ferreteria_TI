import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from app.models import Usuario
from app.security import verify_password

db = SessionLocal()
admin = db.query(Usuario).filter(Usuario.nombre_usuario == 'admin').first()
if admin:
    print('Admin found:', admin.nombre_usuario, admin.rol)
    print('Password check:', verify_password('admin123', admin.password_hash))
else:
    print('Admin not found')

vendedor = db.query(Usuario).filter(Usuario.nombre_usuario == 'vendedor').first()
if vendedor:
    print('Vendedor found:', vendedor.nombre_usuario, vendedor.rol)
    print('Password check:', verify_password('vendedor123', vendedor.password_hash))
else:
    print('Vendedor not found')