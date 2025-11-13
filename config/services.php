<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ocr_space' => [
        'api_key' => env('OCR_SPACE_API_KEY'),
        'base_url' => 'https://api.ocr.space/parse/image',
        'timeout' => 30,
        'default_language' => 'spa',
        'ocr_engine' => 2,
    ],

    'mapbox' => [
        'access_token' => env('MAPBOX_ACCESS_TOKEN'),
        'base_url' => 'https://api.mapbox.com',
    ],

    /*
    |--------------------------------------------------------------------------
    | CompreFace Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración para el servicio de reconocimiento facial CompreFace.
    | Solo utiliza Recognition API para verificación biométrica robusta.
    |
    */

    'compreface' => [
        'enabled' => env('COMPREFACE_ENABLED', true),
        'api_url' => env('COMPREFACE_API_URL', 'http://localhost:8002'),
        'base_url' => env('COMPREFACE_API_URL', 'http://localhost:8002'),
        'api_key' => env('COMPREFACE_API_KEY'),
        'threshold' => env('COMPREFACE_THRESHOLD', 85),
        'face_collection' => env('COMPREFACE_FACE_COLLECTION', 'main'),
    ],  

    'resend' => [
    'key' => env('RESEND_API_KEY'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URL'),
    ],

    /*
    |--------------------------------------------------------------------------
    | ViveSpaces AI Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración para el sistema de Inteligencia Artificial de ViveSpaces.
    | Incluye Machine Learning (Naive Bayes, KNN, MLP) para análisis de búsquedas
    | y generación de recomendaciones personalizadas.
    |
    */

    'ai' => [
        'url' => env('AI_API_URL', 'http://localhost:30801'),
        'timeout' => env('AI_API_TIMEOUT', 15),
        'algorithms' => [
            'naive_bayes' => true,
            'knn' => true,
            'mlp' => true,
            'ensemble' => true,
        ],
    ],

];