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

    public function __construct($code, $userName = null)
    {
        $this->code = $code;
        $this->userName = $userName;
    }

        public function build()
    {
        return $this->subject('Código de Verificación - ViveSpaces')
                    ->from(config('mail.from.address'), config('mail.from.name'))
                    ->replyTo('soporte@vivespaces.com', 'Soporte ViveSpaces')
                    ->view('emails.verification')
                    ->with([
                        'code' => $this->code,
                        'userName' => $this->userName
                    ]);
    }
}
