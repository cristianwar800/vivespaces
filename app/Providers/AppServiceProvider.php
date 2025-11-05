<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
        {
            // Forzar HTTPS en producción (Railway, Ngrok, etc)
            if (request()->getHost() !== 'localhost' && request()->getHost() !== '127.0.0.1') {
                URL::forceScheme('https');
                
                $ngrokUrl = config('app.ngrok_url');
                if ($ngrokUrl) {
                    URL::forceRootUrl($ngrokUrl);
                }
            }
        }
}
