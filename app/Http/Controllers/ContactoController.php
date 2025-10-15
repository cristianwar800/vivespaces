<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\ContactoMail;


class ContactoController extends Controller
{
    /**
     * Muestra el formulario de contacto
     */
    public function index()
    {
        return view('contacto');
    }

    /**
     * Procesa el envío del formulario de contacto
     */
    public function enviar(Request $request)
    {
        // Validar los datos del formulario
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'mensaje' => 'required|string|max:1000',
        ], [
            'nombre.required' => 'El nombre es obligatorio',
            'email.required' => 'El email es obligatorio',
            'email.email' => 'El email debe tener un formato válido',
            'mensaje.required' => 'El mensaje es obligatorio',
            'mensaje.max' => 'El mensaje no puede exceder los 1000 caracteres',
        ]);

        try {
            // Registrar en logs
            Log::info('Nuevo mensaje de contacto recibido', [
                'nombre' => $validated['nombre'],
                'email' => $validated['email'],
                'mensaje' => $validated['mensaje'],
                'ip' => $request->ip(),
                'fecha' => now()->toDateTimeString(),
            ]);

            // Si quieres guardar en base de datos, puedes crear un modelo Contacto
            // y descomentar esta línea:
            // \App\Models\Contacto::create($validated);

            // Si quieres enviar email, puedes crear un Mail y descomentar:
            Mail::to('vivespacessoporte@gmail.com')->send(new ContactoMail($validated));

            // Retornar respuesta JSON para React
            return response()->json([
                'success' => true,
                'message' => '¡Mensaje enviado correctamente! Nos pondremos en contacto contigo pronto.'
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error al enviar mensaje de contacto', [
                'error' => $e->getMessage(),
                'datos' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo.',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
