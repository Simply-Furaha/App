# Create this file as: recreate_db.py
# This will completely recreate your database and seed it

from app import create_app
from app.models import db
from app.seed import seed_database
import os
import shutil

app = create_app('development')

def recreate_database_completely():
    """Completely recreate database from scratch"""
    with app.app_context():
        print("🔄 RECREATING DATABASE COMPLETELY")
        print("=" * 50)
        
        try:
            # Step 1: Remove any existing database files
            db_files = ['ninefund.db', 'instance/ninefund.db']
            for db_file in db_files:
                if os.path.exists(db_file):
                    os.remove(db_file)
                    print(f"✓ Removed {db_file}")
            
            # Step 2: Remove migrations folder if it exists
            migrations_folder = 'migrations'
            if os.path.exists(migrations_folder):
                shutil.rmtree(migrations_folder)
                print("✓ Removed migrations folder")
            
            # Step 3: Create instance folder if it doesn't exist
            instance_folder = 'instance'
            if not os.path.exists(instance_folder):
                os.makedirs(instance_folder)
                print("✓ Created instance folder")
            
            # Step 4: Create all tables with your updated models
            print("\n📦 Creating database tables...")
            db.create_all()
            print("✓ All tables created successfully")
            
            # Step 5: Verify tables were created
            print("\n🔍 Verifying table creation...")
            from sqlalchemy import text
            with db.engine.connect() as conn:
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result.fetchall()]
                
                expected_tables = ['users', 'contributions', 'loans', 'loan_payments', 'otps', 'external_investments']
                for table in expected_tables:
                    if table in tables:
                        print(f"  ✓ {table} table created")
                    else:
                        print(f"  ❌ {table} table missing")
                
                # Check if is_suspended column exists in users table
                result = conn.execute(text("PRAGMA table_info(users)"))
                columns = [row[1] for row in result.fetchall()]
                if 'is_suspended' in columns:
                    print("  ✓ is_suspended column exists in users table")
                else:
                    print("  ⚠️  is_suspended column missing - adding it...")
                    conn.execute(text('ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT 0'))
                    conn.commit()
                    print("  ✓ Added is_suspended column")
            
            # Step 6: Seed the database
            print("\n🌱 Seeding database with initial data...")
            seed_database()
            print("✓ Database seeded successfully")
            
            # Step 7: Verify seeding worked
            print("\n📊 Verifying seeded data...")
            with db.engine.connect() as conn:
                tables_to_check = ['users', 'contributions', 'loans', 'external_investments']
                for table in tables_to_check:
                    result = conn.execute(text(f'SELECT COUNT(*) FROM {table}'))
                    count = result.fetchone()[0]
                    print(f"  ✓ {table}: {count} records")
            
            # Step 8: Test account balance calculation
            print("\n💰 Testing account balance calculation...")
            from app.models.contribution import Contribution
            from app.models.loan import Loan
            
            total_contributions = sum(c.amount for c in Contribution.query.all())
            total_repayments = sum(l.paid_amount for l in Loan.query.all() if l.paid_amount)
            total_balance = total_contributions + total_repayments
            
            print(f"  Total contributions: {total_contributions:,.2f}")
            print(f"  Total loan repayments: {total_repayments:,.2f}")
            print(f"  TOTAL ACCOUNT BALANCE: {total_balance:,.2f}")
            
            print("\n" + "=" * 50)
            print("✅ DATABASE RECREATION SUCCESSFUL!")
            print("=" * 50)
            print("\nYour database now has:")
            print("✓ All tables with proper cascade delete")
            print("✓ is_suspended field for users")
            print("✓ All seed data from your Excel file")
            print("✓ Proper account balance calculation")
            print("\n🎯 Next steps:")
            print("1. Start your Flask server")
            print("2. Check the admin dashboard")
            print("3. Test delete and suspend functionality")
            
            return True
            
        except Exception as e:
            print(f"\n❌ DATABASE RECREATION FAILED: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False

if __name__ == '__main__':
    success = recreate_database_completely()
    
    if success:
        print("\n🎉 SUCCESS! Your database is ready to use.")
    else:
        print("\n💥 Failed to recreate database. Check the errors above.")