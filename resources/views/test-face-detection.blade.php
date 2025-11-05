<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Face Detection</title>
    <script defer src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
    <style>
        body {
            background: #1f2937;
            color: white;
            font-family: monospace;
            padding: 40px;
        }
        .status {
            padding: 20px;
            background: #374151;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .success { background: #065f46; }
        .error { background: #7f1d1d; }
        img {
            max-width: 600px;
            border: 2px solid #4b5563;
            border-radius: 8px;
        }
        .box {
            position: absolute;
            border: 3px solid #10b981;
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.6);
        }
    </style>
</head>
<body>
    <h1>Test Face Detection</h1>
    
    <div id="status" class="status">
        Cargando modelos...
    </div>

    <input type="file" id="fileInput" accept="image/*" style="display:none">
    <button id="uploadBtn" onclick="document.getElementById('fileInput').click()" 
            style="padding:15px 30px; font-size:16px; cursor:pointer; background:#3b82f6; color:white; border:none; border-radius:8px;">
        Subir Imagen de Prueba
    </button>

    <div id="imageContainer" style="position:relative; margin-top:30px;"></div>

    <script>
        let modelsLoaded = false;
        const statusDiv = document.getElementById('status');
        const fileInput = document.getElementById('fileInput');
        const imageContainer = document.getElementById('imageContainer');

        async function loadModels() {
            try {
                console.log('Cargando modelos desde /models...');
                statusDiv.textContent = 'Cargando modelos desde /models...';
                
                await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
                
                console.log('Modelos cargados exitosamente');
                statusDiv.textContent = 'Modelos cargados exitosamente';
                statusDiv.className = 'status success';
                modelsLoaded = true;
                
            } catch (error) {
                console.error('Error cargando modelos:', error);
                statusDiv.textContent = 'Error: ' + error.message;
                statusDiv.className = 'status error';
            }
        }

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!modelsLoaded) {
                alert('Espera a que se carguen los modelos');
                return;
            }

            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            
            imageContainer.innerHTML = '';
            imageContainer.appendChild(img);

            img.onload = async () => {
                console.log('Imagen cargada, detectando rostro...');
                statusDiv.textContent = 'Detectando rostro...';
                statusDiv.className = 'status';

                try {
                    const detection = await faceapi.detectSingleFace(
                        img,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 512,
                            scoreThreshold: 0.3
                        })
                    );

                    if (detection) {
                        console.log('Rostro detectado:', detection.box);
                        statusDiv.textContent = 'Rostro detectado! X:' + Math.round(detection.box.x) + 
                                                ' Y:' + Math.round(detection.box.y) + 
                                                ' W:' + Math.round(detection.box.width) + 
                                                ' H:' + Math.round(detection.box.height);
                        statusDiv.className = 'status success';

                        const box = document.createElement('div');
                        box.className = 'box';
                        box.style.left = detection.box.x + 'px';
                        box.style.top = detection.box.y + 'px';
                        box.style.width = detection.box.width + 'px';
                        box.style.height = detection.box.height + 'px';
                        imageContainer.appendChild(box);
                    } else {
                        console.log('No se detecto rostro');
                        statusDiv.textContent = 'No se detecto rostro en la imagen';
                        statusDiv.className = 'status error';
                    }
                } catch (error) {
                    console.error('Error detectando:', error);
                    statusDiv.textContent = 'Error: ' + error.message;
                    statusDiv.className = 'status error';
                }
            };
        });

        loadModels();
    </script>
</body>
</html>