# Speed Squad (App do Entregador)

## Como enviar atualizações para a App Store (Apple)
Este projeto utiliza Capacitor. Ao fazer alterações, se ocorrer problemas de compilação no Mac devido à falta de arquivos do iOS (`config.xml`, `capacitor.config.json` ou ícones faltando), certifique-se de rodar:
`npx cap sync ios` e `npx @capacitor/assets generate --ios` no ambiente de compilação, ou garantir que esses arquivos sejam forçados no Github.

### 1. Pré-requisitos (Chave da API App Store Connect)
Você precisa de uma chave `.p8` gerada no App Store Connect com acesso de Administrador. Salve-a no Mac remoto:
```bash
mkdir -p ~/.private_keys
cat << 'EOF' > ~/.private_keys/AuthKey_SUACHAVE.p8
-----BEGIN PRIVATE KEY-----
(sua chave aqui)
-----END PRIVATE KEY-----
EOF
```

### 2. Script de Build e Upload (Sem Xcode App)
Substitua `TEAM_ID`, `KEY_ID` e `ISSUER_ID` pelos seus dados reais.

```bash
cd ~/Documents/speed-squad
git pull origin main

mkdir -p build
cat << EOF > build/ExportOptions.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>SEU_TEAM_ID</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>
EOF

rm -rf build/App.xcarchive build/App.ipa

# 1. Archive
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release archive -archivePath build/App.xcarchive DEVELOPMENT_TEAM="SEU_TEAM_ID" -allowProvisioningUpdates -authenticationKeyPath "$HOME/.private_keys/AuthKey_SUACHAVE.p8" -authenticationKeyID "SEU_KEY_ID" -authenticationKeyIssuerID "SEU_ISSUER_ID"

# 2. Export
xcodebuild -exportArchive -archivePath build/App.xcarchive -exportOptionsPlist build/ExportOptions.plist -exportPath build/ -allowProvisioningUpdates -authenticationKeyPath "$HOME/.private_keys/AuthKey_SUACHAVE.p8" -authenticationKeyID "SEU_KEY_ID" -authenticationKeyIssuerID "SEU_ISSUER_ID"

# 3. Upload
xcrun altool --upload-app -f build/App.ipa -t ios --apiKey "SEU_KEY_ID" --apiIssuer "SEU_ISSUER_ID"
```
