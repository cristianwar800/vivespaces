<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nuevo Mensaje de Contacto</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 24px;
        }
        .info-section {
            margin-bottom: 25px;
        }
        .info-section h3 {
            color: #007bff;
            margin-bottom: 10px;
            font-size: 18px;
        }
        .info-item {
            margin-bottom: 15px;
        }
        .info-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            width: 80px;
        }
        .info-value {
            color: #333;
        }
        .message-box {
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nuevo Mensaje de Contacto</h1>
            <p>Has recibido un nuevo mensaje a través del formulario de contacto</p>
        </div>

        <div class="info-section">
            <h3>Información del Remitente</h3>
            <div class="info-item">
                <span class="info-label">Nombre:</span>
                <span class="info-value">{{ $nombre }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">{{ $email }}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Fecha:</span>
                <span class="info-value">{{ $fecha }}</span>
            </div>
        </div>

        <div class="info-section">
            <h3>Mensaje</h3>
            <div class="message-box">
                {{ $mensaje }}
            </div>
        </div>

        <div class="footer">
            <p>Este mensaje fue enviado desde el formulario de contacto de ViveSpaces</p>
            <p>Puedes responder directamente a este email para contactar con {{ $nombre }}</p>
        </div>
    </div>
</body>
</html>
