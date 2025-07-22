<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Código de Verificación - ViveSpaces</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #f8fafc !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
            line-height: 1.6;
        }

        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }

        .header {
            background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
            padding: 40px 30px;
            text-align: center;
        }

        .logo {
            color: #ffffff;
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 8px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }

        .logo-icon {
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin: 0;
        }

        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .message {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 32px;
            line-height: 1.6;
        }

        .code-container {
            text-align: center;
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
            border-radius: 16px;
            border: 2px dashed #10b981;
        }

        .code-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .verification-code {
            font-size: 48px;
            font-weight: 800;
            color: #10b981;
            letter-spacing: 8px;
            margin: 0;
            font-family: 'Courier New', monospace;
        }

        .expiry-info {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 32px 0;
            text-align: center;
        }

        .expiry-text {
            color: #92400e;
            font-size: 14px;
            font-weight: 500;
            margin: 0;
        }

        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }

        .footer-text {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 16px;
        }

        .social-links {
            margin-top: 20px;
        }

        .social-link {
            display: inline-block;
            margin: 0 8px;
            width: 40px;
            height: 40px;
            background-color: #10b981;
            border-radius: 50%;
            text-align: center;
            line-height: 40px;
            color: white;
            text-decoration: none;
        }

        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }

        .security-tip {
            background-color: #f3f4f6;
            border-left: 4px solid #6b7280;
            padding: 16px;
            margin-top: 20px;
        }

        .security-tip-text {
            color: #4b5563;
            font-size: 14px;
            margin: 0;
        }

        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 10px;
                width: calc(100% - 20px);
            }

            .content {
                padding: 30px 20px;
            }

            .verification-code {
                font-size: 36px;
                letter-spacing: 4px;
            }
        }
    </style>
</head>
<body>
    <div style="background-color: #f8fafc; padding: 20px 0;">
        <div class="email-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">
                    <div class="logo-icon">🏠</div>
                    ViveSpaces
                </div>
                <p class="header-subtitle">Tu hogar ideal te está esperando</p>
            </div>

            <!-- Content -->
            <div class="content">
                @if($userName)
                    <h2 class="greeting">¡Hola {{ $userName }}!</h2>
                @else
                    <h2 class="greeting">¡Hola!</h2>
                @endif

                <p class="message">
                    Gracias por unirte a ViveSpaces. Para completar tu registro y comenzar a explorar las mejores propiedades, necesitamos verificar tu dirección de email.
                </p>

                <!-- Código de verificación -->
                <div class="code-container">
                    <p class="code-label">Tu código de verificación</p>
                    <h1 class="verification-code">{{ $code }}</h1>
                </div>

                <!-- Información de expiración -->
                <div class="expiry-info">
                    <p class="expiry-text">
                        ⏰ Este código expira en 10 minutos por tu seguridad
                    </p>
                </div>

                <div class="divider"></div>

                <!-- Tip de seguridad -->
                <div class="security-tip">
                    <p class="security-tip-text">
                        <strong>💡 Consejo de seguridad:</strong> Nunca compartas este código con nadie. ViveSpaces nunca te pedirá tu código por teléfono o email.
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p class="footer-text">
                    ¿Tienes problemas? Contáctanos en
                    <a href="mailto:soporte@vivespaces.com" style="color: #10b981; text-decoration: none;">soporte@vivespaces.com</a>
                </p>

                <div class="social-links">
                    <a href="#" class="social-link">📧</a>
                    <a href="#" class="social-link">📱</a>
                    <a href="#" class="social-link">🌐</a>
                </div>

                <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
                    © 2025 ViveSpaces. Todos los derechos reservados.<br>
                    Este email fue enviado desde una dirección que no acepta respuestas.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
