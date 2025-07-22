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
        if (request()->getHost() !== 'localhost' && request()->getHost() !== '127.0.0.1') {
            $ngrokUrl = config('app.ngrok_url');
            if ($ngrokUrl) {
                URL::forceRootUrl($ngrokUrl);
                URL::forceScheme('https');
            }
        }
    }
}
