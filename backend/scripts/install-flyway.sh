#!/bin/bash

# Create a directory for Flyway
mkdir -p ~/.flyway

# Download Flyway
wget https://repo1.maven.org/maven2/org/flywaydb/flyway-commandline/9.22.3/flyway-commandline-9.22.3-linux-x64.tar.gz

# Extract Flyway
tar -xzf flyway-commandline-9.22.3-linux-x64.tar.gz

# Move to the flyway directory
mv flyway-9.22.3/* ~/.flyway/

# Clean up
rm -rf flyway-9.22.3 flyway-commandline-9.22.3-linux-x64.tar.gz

# Add Flyway to PATH
echo 'export PATH="$PATH:$HOME/.flyway"' >> ~/.bashrc
echo 'export PATH="$PATH:$HOME/.flyway"' >> ~/.zshrc

# Make flyway executable
chmod +x ~/.flyway/flyway

echo "Flyway has been installed to ~/.flyway"
echo "Please restart your terminal or run 'source ~/.bashrc' (or 'source ~/.zshrc') to update your PATH" 