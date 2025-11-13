<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EmailVerificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public $code;
    public $userName;
    public $type; // 🆕 NUEVO

    public function __construct($code, $userName = null, $type = 'verification')
    {
        $this->code = $code;
        $this->userName = $userName;
        $this->type = $type; // 🆕 'verification' o 'password_reset'
    }

    public function build()
    {
        // 🆕 Cambiar asunto según el tipo
        $subject = $this->type === 'password_reset' 
            ? 'Recuperación de Contraseña - ViveSpaces'
            : 'Código de Verificación - ViveSpaces';

        return $this->subject($subject)
                    ->from(config('mail.from.address'), config('mail.from.name'))
                    ->replyTo('soporte@vivespaces.com', 'Soporte ViveSpaces')
                    ->view('emails.verification') // 🆕 Misma vista para ambos
                    ->with([
                        'code' => $this->code,
                        'userName' => $this->userName,
                        'type' => $this->type // 🆕 Pasar tipo a la vista
                    ]);
    }
}