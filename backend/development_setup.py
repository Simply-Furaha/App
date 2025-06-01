# development_setup.py
# Store this file in your project root directory
# Run: python development_setup.py

import os
import subprocess
import sys
import requests
import json
from dotenv import load_dotenv

def print_banner():
    print("=" * 60)
    print("🚀 NINEFUND M-PESA DEVELOPMENT SETUP")
    print("=" * 60)

def check_ngrok_installation():
    """Check if ngrok is installed and provide installation instructions"""
    print("\n📡 Checking ngrok installation...")
    
    try:
        result = subprocess.run(['ngrok', 'version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ ngrok is installed:", result.stdout.strip())
            return True
    except FileNotFoundError:
        pass
    
    print("❌ ngrok not found. Please install ngrok:")
    print("   1. Visit: https://ngrok.com/download")
    print("   2. Download and install ngrok")
    print("   3. Sign up for a free account")
    print("   4. Run: ngrok authtoken YOUR_AUTHTOKEN")
    print("   5. Then run this script again")
    return False

def get_ngrok_tunnel():
    """Get the current ngrok tunnel URL"""
    try:
        response = requests.get('http://localhost:4040/api/tunnels', timeout=5)
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            for tunnel in tunnels:
                if tunnel['config']['addr'] == 'localhost:5000':
                    return tunnel['public_url']
    except:
        pass
    return None

def start_ngrok():
    """Start ngrok tunnel for port 5000"""
    print("\n🌐 Starting ngrok tunnel...")
    
    # Check if ngrok is already running
    tunnel_url = get_ngrok_tunnel()
    if tunnel_url:
        print(f"✅ ngrok already running: {tunnel_url}")
        return tunnel_url
    
    # Start ngrok
    print("   Starting ngrok http 5000...")
    print("   (This will open in a new terminal window)")
    
    if os.name == 'nt':  # Windows
        subprocess.Popen(['start', 'cmd', '/k', 'ngrok', 'http', '5000'], shell=True)
    else:  # macOS/Linux
        subprocess.Popen(['gnome-terminal', '--', 'ngrok', 'http', '5000'])
    
    print("\n⏳ Waiting for ngrok to start...")
    print("   Please wait 10 seconds for ngrok to initialize...")
    
    import time
    time.sleep(10)
    
    # Try to get the tunnel URL
    tunnel_url = get_ngrok_tunnel()
    if tunnel_url:
        print(f"✅ ngrok tunnel created: {tunnel_url}")
        return tunnel_url
    else:
        print("❌ Could not detect ngrok tunnel. Please check ngrok manually.")
        print("   Visit: http://localhost:4040 to see ngrok status")
        return None

def update_env_file(ngrok_url):
    """Update .env file with ngrok URLs"""
    if not ngrok_url:
        return
    
    print(f"\n📝 Updating .env file with ngrok URL: {ngrok_url}")
    
    env_path = '.env'
    
    # Read existing .env file
    env_lines = []
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            env_lines = f.readlines()
    
    # Update M-PESA URLs
    mpesa_urls = {
        'MPESA_CALLBACK_URL': f'{ngrok_url}/api/mpesa/callback',
        'MPESA_VALIDATION_URL': f'{ngrok_url}/api/mpesa/validation',
        'MPESA_CONFIRMATION_URL': f'{ngrok_url}/api/mpesa/confirmation'
    }
    
    # Update or add M-PESA URLs
    for key, value in mpesa_urls.items():
        found = False
        for i, line in enumerate(env_lines):
            if line.startswith(f'{key}='):
                env_lines[i] = f'{key}={value}\n'
                found = True
                break
        
        if not found:
            env_lines.append(f'{key}={value}\n')
    
    # Write updated .env file
    with open(env_path, 'w') as f:
        f.writelines(env_lines)
    
    print("✅ .env file updated with ngrok URLs")

def validate_env_configuration():
    """Validate .env file configuration"""
    print("\n🔍 Validating .env configuration...")
    
    load_dotenv()
    
    required_vars = [
        'MPESA_CONSUMER_KEY',
        'MPESA_CONSUMER_SECRET',
        'MPESA_SHORTCODE',
        'MPESA_PASSKEY',
        'MPESA_CALLBACK_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\n📋 Please add these to your .env file:")
        print("   Get credentials from: https://developer.safaricom.co.ke/")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def print_next_steps():
    """Print next steps for the developer"""
    print("\n" + "=" * 60)
    print("🎯 NEXT STEPS")
    print("=" * 60)
    print("1. ✅ Environment configured")
    print("2. 🔑 Get Safaricom credentials:")
    print("   - Visit: https://developer.safaricom.co.ke/")
    print("   - Create an app and get Consumer Key & Secret")
    print("   - Add credentials to .env file")
    print("3. 🚀 Start your Flask server:")
    print("   python wsgi.py")
    print("4. 🧪 Test M-PESA integration:")
    print("   - Make a contribution")
    print("   - Check callback logs")
    print("5. 📱 Use Safaricom sandbox test numbers:")
    print("   - Phone: 254708374149")
    print("   - PIN: 1234")
    print("\n💡 Tips:")
    print("   - Keep ngrok running while testing")
    print("   - Check ngrok dashboard: http://localhost:8080")
    print("   - Monitor Flask logs for M-PESA callbacks")

def main():
    """Main setup function"""
    print_banner()
    
    # Check ngrok installation
    if not check_ngrok_installation():
        sys.exit(1)
    
    # Start ngrok
    ngrok_url = start_ngrok()
    
    # Update .env file
    update_env_file(ngrok_url)
    
    # Validate configuration
    validate_env_configuration()
    
    # Print next steps
    print_next_steps()

if __name__ == "__main__":
    main()