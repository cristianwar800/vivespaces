<?php

namespace App\Http\Controllers;

use App\Models\UserRating;
use App\Models\User;
use App\Models\Message;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class UserRatingController extends Controller
{
    // Verificar si puede calificar
    public function canRate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'property_id' => 'required|exists:properties,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $userId = $request->user_id;
        $propertyId = $request->property_id;
        $currentUserId = Auth::id();

        $hasRated = UserRating::hasRated($currentUserId, $userId, $propertyId);

        $existingRating = null;
        if ($hasRated) {
            $existingRating = UserRating::where('rater_id', $currentUserId)
                                        ->where('rated_id', $userId)
                                        ->where('property_id', $propertyId)
                                        ->first();
        }

        return response()->json([
            'success' => true,
            'can_rate' => !$hasRated,
            'has_rated' => $hasRated,
            'existing_rating' => $existingRating
        ]);
    }

    // Guardar o actualizar calificación
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'rated_id' => 'required|exists:users,id',
            'property_id' => 'required|exists:properties,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:500'
        ], [
            'rated_id.required' => 'El usuario a calificar es requerido',
            'rating.required' => 'La calificación es requerida',
            'rating.min' => 'La calificación mínima es 1 estrella',
            'rating.max' => 'La calificación máxima es 5 estrellas',
            'comment.max' => 'El comentario no puede exceder 500 caracteres'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $raterId = Auth::id();
        $ratedId = $request->rated_id;
        $propertyId = $request->property_id;

        if ($raterId === $ratedId) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes calificarte a ti mismo'
            ], 422);
        }

        try {
            $existingRating = UserRating::where('rater_id', $raterId)
                                        ->where('rated_id', $ratedId)
                                        ->where('property_id', $propertyId)
                                        ->first();

            if ($existingRating) {
                $existingRating->update([
                    'rating' => $request->rating,
                    'comment' => $request->comment
                ]);
                $rating = $existingRating;
                $message = 'Calificación actualizada exitosamente';
            } else {
                $rating = UserRating::create([
                    'rater_id' => $raterId,
                    'rated_id' => $ratedId,
                    'property_id' => $propertyId,
                    'rating' => $request->rating,
                    'comment' => $request->comment
                ]);
                $message = 'Calificación guardada exitosamente';
            }

            $rating->load(['rater', 'rated', 'property']);

            return response()->json([
                'success' => true,
                'message' => $message,
                'rating' => $rating
            ]);

        } catch (\Exception $e) {
            \Log::error('Error al guardar calificación: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al guardar la calificación'
            ], 500);
        }
    }

    // 🆕 Contar mensajes en una conversación
    public function getConversationMessageCount($propertyId, $userId)
    {
        try {
            $currentUserId = Auth::id();
            
            $count = Message::where('property_id', $propertyId)
                ->where(function($query) use ($currentUserId, $userId) {
                    $query->where(function($q) use ($currentUserId, $userId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $userId);
                    })->orWhere(function($q) use ($currentUserId, $userId) {
                        $q->where('sender_id', $userId)
                          ->where('receiver_id', $currentUserId);
                    });
                })
                ->count();

            return response()->json([
                'success' => true,
                'message_count' => $count
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // 🆕 Detectar si el último mensaje contiene frases clave para calificar
    public function detectRatingKeywords(Request $request)
    {
        $keyPhrases = [
            'gracias por la información',
            'gracias por la info',
            'muchas gracias',
            'perfecto, nos vemos',
            'nos vemos',
            'ok, quedamos así',
            'quedamos así',
            'entendido',
            'perfecto',
            'de acuerdo',
            'está bien',
            'muchas gracias por todo',
            'gracias por tu tiempo',
            'excelente',
            'todo claro',
            'ok gracias',
            'gracias',
            'thanks',
            'thank you',
            'perfect',
            'okey',
            'ok'
        ];

        $message = strtolower($request->message ?? '');
        
        $detected = false;
        $matchedPhrase = null;
        
        foreach ($keyPhrases as $phrase) {
            if (strpos($message, $phrase) !== false) {
                $detected = true;
                $matchedPhrase = $phrase;
                break;
            }
        }

        return response()->json([
            'success' => true,
            'should_show_rating' => $detected,
            'matched_phrase' => $matchedPhrase
        ]);
    }

    // 🆕 Verificar si debe mostrar notificación de calificación
    public function shouldShowRatingPrompt(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'property_id' => 'required|exists:properties,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $currentUserId = Auth::id();
        $userId = $request->user_id;
        $propertyId = $request->property_id;

        try {
            // Verificar si ya calificó
            $hasRated = UserRating::hasRated($currentUserId, $userId, $propertyId);
            
            if ($hasRated) {
                return response()->json([
                    'success' => true,
                    'should_show' => false,
                    'reason' => 'already_rated'
                ]);
            }

            // Contar mensajes en la conversación
            $messageCount = Message::where('property_id', $propertyId)
                ->where(function($query) use ($currentUserId, $userId) {
                    $query->where(function($q) use ($currentUserId, $userId) {
                        $q->where('sender_id', $currentUserId)
                          ->where('receiver_id', $userId);
                    })->orWhere(function($q) use ($currentUserId, $userId) {
                        $q->where('sender_id', $userId)
                          ->where('receiver_id', $currentUserId);
                    });
                })
                ->count();

            // Mostrar notificación si han intercambiado 8 o más mensajes
            $shouldShow = $messageCount >= 8;

            return response()->json([
                'success' => true,
                'should_show' => $shouldShow,
                'message_count' => $messageCount,
                'reason' => $shouldShow ? 'enough_messages' : 'not_enough_messages'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Obtener estadísticas de un usuario
    public function getUserStats($userId)
    {
        try {
            $user = User::findOrFail($userId);

            $stats = [
                'average_rating' => round($user->getAverageRating(), 1),
                'total_ratings' => $user->getTotalRatings(),
                'rating_distribution' => $user->getRatingDistribution(),
                'recent_ratings' => $user->getRecentRatings(5)
            ];

            return response()->json([
                'success' => true,
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener estadísticas'
            ], 500);
        }
    }

    // Obtener todas las calificaciones de un usuario
    public function getUserRatings($userId)
    {
        try {
            $ratings = UserRating::where('rated_id', $userId)
                                ->with(['rater', 'property'])
                                ->orderBy('created_at', 'desc')
                                ->paginate(10);

            return response()->json([
                'success' => true,
                'ratings' => $ratings
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al obtener calificaciones'
            ], 500);
        }
    }

    // Eliminar calificación
    public function destroy($ratingId)
    {
        try {
            $rating = UserRating::findOrFail($ratingId);

            if ($rating->rater_id !== Auth::id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No tienes permiso para eliminar esta calificación'
                ], 403);
            }

            $rating->delete();

            return response()->json([
                'success' => true,
                'message' => 'Calificación eliminada exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la calificación'
            ], 500);
        }
    }
}