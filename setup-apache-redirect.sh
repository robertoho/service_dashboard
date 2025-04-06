#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run this script as root or with sudo${NC}"
  exit 1
fi

# Check if Apache2 is installed
if ! dpkg -l | grep -q apache2; then
  echo -e "${RED}Apache2 is not installed. Please install it first:${NC}"
  echo -e "${YELLOW}sudo apt update && sudo apt install apache2${NC}"
  exit 1
fi

echo -e "${GREEN}Apache2 is installed. Proceeding with configuration...${NC}"

# Enable required Apache modules
echo -e "${YELLOW}Enabling required Apache modules...${NC}"
a2enmod proxy proxy_http rewrite ssl

# Create virtual host configuration
VHOST_FILE="/etc/apache2/sites-available/casa.amimodo.pl.conf"

echo -e "${YELLOW}Creating Apache virtual host configuration at ${VHOST_FILE}${NC}"

cat > "$VHOST_FILE" << EOF
<VirtualHost *:80>
    ServerName casa.amimodo.pl
    ServerAlias www.casa.amimodo.pl

    # Redirect all HTTP traffic to the local server
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ErrorLog \${APACHE_LOG_DIR}/casa.amimodo.pl-error.log
    CustomLog \${APACHE_LOG_DIR}/casa.amimodo.pl-access.log combined
</VirtualHost>
EOF

# Enable the site
echo -e "${YELLOW}Enabling the virtual host...${NC}"
a2ensite casa.amimodo.pl.conf

# Check if /etc/hosts has the entry for casa.amimodo.pl
if ! grep -q "casa.amimodo.pl" /etc/hosts; then
  echo -e "${YELLOW}Adding casa.amimodo.pl to /etc/hosts...${NC}"
  echo "127.0.0.1 casa.amimodo.pl www.casa.amimodo.pl" >> /etc/hosts
fi

# Check configuration and restart Apache
echo -e "${YELLOW}Checking Apache configuration...${NC}"
if apache2ctl configtest; then
  echo -e "${GREEN}Configuration test passed. Restarting Apache...${NC}"
  systemctl restart apache2
  echo -e "${GREEN}Done! Apache is now configured to redirect requests from casa.amimodo.pl to your local server.${NC}"
  echo -e "${GREEN}You can access your application at http://casa.amimodo.pl${NC}"
else
  echo -e "${RED}Apache configuration test failed. Please check the configuration manually.${NC}"
  exit 1
fi

# Print reminder about DNS configuration
echo -e "${YELLOW}NOTE: For this to work from other machines, you need to:${NC}"
echo -e "${YELLOW}1. Ensure DNS for casa.amimodo.pl points to this server's public IP address${NC}"
echo -e "${YELLOW}2. Make sure port 80 is open in your firewall${NC}"
echo -e "${YELLOW}3. If using this in production, consider adding SSL with Let's Encrypt${NC}" 