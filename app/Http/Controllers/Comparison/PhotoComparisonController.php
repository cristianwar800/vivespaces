<?php

namespace App\Http\Controllers\Comparison;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PhotoComparisonController extends Controller
{
    public function index()
    {
        if (Auth::user()->is_identity_verified ?? false) {
            return redirect()->route('dashboard')->with('info', 'Ya tienes tu identidad verificada.');
        }

        return view('photo-verification');
    }

    public function verifyPhotos(Request $request)
    {
        $request->validate([
            'ine_verified' => 'required|boolean',
            'person_verified' => 'required|boolean',
            'ine_confidence' => 'required|numeric|min:0|max:1',
            'person_confidence' => 'required|numeric|min:0|max:1'
        ]);

        $user = Auth::user();

        if ($request->ine_verified && $request->person_verified) {
            $user->update([
                'is_identity_verified' => true,
                'verified_at' => now(),
                'verification_method' => 'ai_photo_comparison'
            ]);

            return response()->json([
                'success' => true,
                'message' => '¡Identidad verificada exitosamente!',
                'redirect' => route('dashboard')
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Verificación fallida. Intenta nuevamente.'
        ]);
    }

    public function getVerificationStatus()
    {
        $user = Auth::user();

        return response()->json([
            'is_verified' => $user->is_identity_verified ?? false,
            'verified_at' => $user->verified_at ?? null,
            'user_name' => $user->name . ' ' . $user->last_name
        ]);
    }
}
