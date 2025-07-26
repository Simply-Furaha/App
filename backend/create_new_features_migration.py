# create_new_features_migration.py
# Run this script to add the new tables to your existing database

from app import create_app
from app.models import db
from app.models.admin_log import AdminActivityLog
from app.models.overpayment import Overpayment
from sqlalchemy import text
import os

app = create_app('development')

def add_new_tables():
    """Add new tables for admin logging and overpayment management"""
    with app.app_context():
        print("🔄 ADDING NEW FEATURES TO DATABASE")
        print("=" * 50)
        
        try:
            # Check if tables already exist
            with db.engine.connect() as conn:
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                existing_tables = [row[0] for row in result.fetchall()]
                
                print(f"📋 Existing tables: {existing_tables}")
                
                # Create new tables
                print("\n📦 Creating new tables...")
                
                # Create admin_activity_logs table
                if 'admin_activity_logs' not in existing_tables:
                    db.create_all()
                    print("✓ admin_activity_logs table created")
                else:
                    print("✓ admin_activity_logs table already exists")
                
                # Create overpayments table
                if 'overpayments' not in existing_tables:
                    db.create_all()
                    print("✓ overpayments table created")
                else:
                    print("✓ overpayments table already exists")
                
                # Verify new tables
                print("\n🔍 Verifying new tables...")
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                updated_tables = [row[0] for row in result.fetchall()]
                
                new_tables = ['admin_activity_logs', 'overpayments']
                for table in new_tables:
                    if table in updated_tables:
                        print(f"  ✓ {table} table verified")
                    else:
                        print(f"  ❌ {table} table missing")
                
                # Test table structures
                print("\n🔧 Testing table structures...")
                
                # Test admin_activity_logs structure
                try:
                    result = conn.execute(text("PRAGMA table_info(admin_activity_logs)"))
                    columns = [row[1] for row in result.fetchall()]
                    expected_columns = [
                        'id', 'admin_id', 'action', 'target_type', 'target_id', 
                        'target_name', 'description', 'old_values', 'new_values',
                        'ip_address', 'user_agent', 'created_at'
                    ]
                    
                    missing_columns = [col for col in expected_columns if col not in columns]
                    if not missing_columns:
                        print("  ✓ admin_activity_logs structure verified")
                    else:
                        print(f"  ⚠️  admin_activity_logs missing columns: {missing_columns}")
                except Exception as e:
                    print(f"  ❌ Error checking admin_activity_logs structure: {e}")
                
                # Test overpayments structure
                try:
                    result = conn.execute(text("PRAGMA table_info(overpayments)"))
                    columns = [row[1] for row in result.fetchall()]
                    expected_columns = [
                        'id', 'user_id', 'original_payment_type', 'original_payment_id',
                        'expected_amount', 'actual_amount', 'overpayment_amount', 'status',
                        'allocation_type', 'allocation_target_id', 'allocated_amount',
                        'remaining_amount', 'admin_id', 'admin_notes', 'created_at', 'allocated_at'
                    ]
                    
                    missing_columns = [col for col in expected_columns if col not in columns]
                    if not missing_columns:
                        print("  ✓ overpayments structure verified")
                    else:
                        print(f"  ⚠️  overpayments missing columns: {missing_columns}")
                except Exception as e:
                    print(f"  ❌ Error checking overpayments structure: {e}")
                
                print("\n" + "=" * 50)
                print("✅ NEW FEATURES MIGRATION SUCCESSFUL!")
                print("=" * 50)
                print("\nNew features added:")
                print("✓ Admin Activity Logging")
                print("✓ Overpayment Management")
                print("✓ Enhanced Admin Controls")
                
                print("\n🎯 NEXT STEPS:")
                print("1. Update your frontend with the new components")
                print("2. Test the new admin features")
                print("3. Check activity logs and overpayment management")
                
                return True
                
        except Exception as e:
            print(f"\n❌ MIGRATION FAILED: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False

if __name__ == '__main__':
    print("🚀 STARTING NEW FEATURES MIGRATION")
    print("This will add admin activity logging and overpayment management to your database.")
    print()
    
    success = add_new_tables()
    
    if success:
        print("\n🎉 SUCCESS! New features have been added to your database.")
        print("Your system now supports:")
        print("- Admin activity logging with detailed tracking")
        print("- Overpayment management and allocation")
        print("- Enhanced admin-to-admin operations")
    else:
        print("\n💥 Migration failed. Please check the error messages above.")