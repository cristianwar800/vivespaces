<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', '*'],
    
    'allowed_methods' => ['*'],
    
    'allowed_origins' => ['*'],  // Permite todos los orígenes (solo desarrollo)
    
    'allowed_origins_patterns' => [],
    
    'allowed_headers' => ['*'],
    
    'exposed_headers' => [],
    
    'max_age' => 0,
    
    'supports_credentials' => true,
];