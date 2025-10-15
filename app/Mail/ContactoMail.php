<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactoMail extends Mailable
{
    use Queueable, SerializesModels;

    public $datos;

    public function __construct($datos)
    {
        $this->datos = $datos;
    }

    public function build()
    {
        return $this->subject('Nuevo Mensaje de Contacto - ViveSpaces')
                    ->from(config('mail.from.address'), config('mail.from.name'))
                    ->replyTo($this->datos['email'], $this->datos['nombre'])
                    ->view('emails.contacto')
                    ->with([
                        'nombre' => $this->datos['nombre'],
                        'email' => $this->datos['email'],
                        'mensaje' => $this->datos['mensaje'],
                        'fecha' => now()->format('d/m/Y H:i:s')
                    ]);
    }
}
