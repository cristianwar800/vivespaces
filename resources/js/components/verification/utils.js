import React from 'react';

export const preprocessImage = async (canvas) => {
    return new Promise((resolve) => {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            totalBrightness += brightness;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        console.log('Brillo promedio original:', avgBrightness.toFixed(2));

        const targetBrightness = 145;
        const adjustment = (targetBrightness - avgBrightness) * 0.5;

        if (Math.abs(adjustment) > 8) {
            console.log('Ajustando brillo en:', adjustment.toFixed(2));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, data[i] + adjustment));
                data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + adjustment));
                data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + adjustment));
            }
        }

        const contrast = 1.15;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrast + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrast + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrast + 128));
        }

        const tempData = new Uint8ClampedArray(data);
        for (let y = 1; y < canvas.height - 1; y++) {
            for (let x = 1; x < canvas.width - 1; x++) {
                const idx = (y * canvas.width + x) * 4;
                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                
                if (brightness < 50) {
                    const neighbors = [
                        ((y-1) * canvas.width + x) * 4,
                        ((y+1) * canvas.width + x) * 4,
                        (y * canvas.width + (x-1)) * 4,
                        (y * canvas.width + (x+1)) * 4
                    ];
                    
                    for (let c = 0; c < 3; c++) {
                        let sum = data[idx + c];
                        neighbors.forEach(n => sum += data[n + c]);
                        tempData[idx + c] = sum / 5;
                    }
                }
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = tempData[i];
        }

        ctx.putImageData(imageData, 0, 0);
        console.log('Preprocesamiento completado');
        resolve();
    });
};

export const preprocessUploadedImage = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0);
                await preprocessImage(canvas);
                
                canvas.toBlob((blob) => {
                    const enhancedFile = new File([blob], file.name, { type: 'image/jpeg' });
                    resolve({
                        file: enhancedFile,
                        preview: canvas.toDataURL('image/jpeg', 0.92)
                    });
                }, 'image/jpeg', 0.92);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export const getDocumentInfo = (type) => {
    const ineIcon = React.createElement('svg', {
        className: 'w-10 h-10 text-white',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
    }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2'
    }));

    const comprobanteIcon = React.createElement('svg', {
        className: 'w-10 h-10 text-white',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
    }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
    }));

    const defaultIcon = React.createElement('svg', {
        className: 'w-10 h-10 text-white',
        fill: 'none',
        stroke: 'currentColor',
        viewBox: '0 0 24 24'
    }, React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2',
        d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    }));

    switch(type) {
        case 'ine':
            return {
                title: 'Tu INE',
                description: 'Credencial para votar vigente',
                color: 'emerald',
                bgGradient: 'from-emerald-500 to-green-600',
                borderColor: 'border-emerald-400 dark:border-emerald-500',
                hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10',
                tips: [
                    'Usa buena iluminacion sin sombras',
                    'Asegurate de que todo el documento sea visible',
                    'Evita reflejos en la foto',
                    'La foto debe estar enfocada y nitida'
                ],
                icon: ineIcon
            };
        case 'comprobante':
            return {
                title: 'Comprobante de Domicilio',
                description: 'Servicio reciente (max. 4 meses)',
                color: 'blue',
                bgGradient: 'from-blue-500 to-cyan-600',
                borderColor: 'border-blue-400 dark:border-blue-500',
                hoverBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10',
                tips: [
                    'Usa buena iluminacion sin sombras',
                    'Asegurate de que todo el documento sea visible',
                    'Evita reflejos en la foto',
                    'La foto debe estar enfocada y nitida',
                    'El comprobante debe tener maximo 4 meses de antiguedad'
                ],
                icon: comprobanteIcon
            };
        default:
            return {
                title: 'Documento',
                description: 'Documento oficial',
                color: 'gray',
                bgGradient: 'from-gray-500 to-gray-600',
                borderColor: 'border-gray-400 dark:border-gray-500',
                hoverBg: 'hover:bg-gray-50/50 dark:hover:bg-gray-900/10',
                tips: [
                    'Usa buena iluminacion sin sombras',
                    'Asegurate de que todo el documento sea visible',
                    'Evita reflejos en la foto',
                    'La foto debe estar enfocada y nitida'
                ],
                icon: defaultIcon
            };
    }
};