<?php

namespace App\Http\Controllers;

use App\Models\Property;
use App\Models\PropertyReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PropertyReportController extends Controller
{
    /**
     * Reglas de validación para reportes
     */
    private function getValidationRules()
    {
        return [
            'category' => 'required|string|in:' . implode(',', array_keys(PropertyReport::CATEGORIES)),
            'reason' => 'required|string|max:255',
            'description' => 'nullable|string|max:2000',
            'evidence' => 'nullable|array',
            'evidence.*' => 'nullable|string|url',
            'priority' => 'sometimes|string|in:' . implode(',', array_keys(PropertyReport::PRIORITIES)),
        ];
    }

    /**
     * Mensajes de validación personalizados
     */
    private function getValidationMessages()
    {
        return [
            'category.required' => 'La categoría del reporte es obligatoria.',
            'category.in' => 'La categoría seleccionada no es válida.',
            'reason.required' => 'El motivo del reporte es obligatorio.',
            'reason.max' => 'El motivo no puede tener más de 255 caracteres.',
            'description.max' => 'La descripción no puede tener más de 2000 caracteres.',
            'evidence.array' => 'La evidencia debe ser una lista de URLs.',
            'evidence.*.url' => 'Cada evidencia debe ser una URL válida.',
            'priority.in' => 'La prioridad seleccionada no es válida.',
        ];
    }

    /**
     * Crear un nuevo reporte de propiedad
     */
    public function store(Request $request, Property $property)
    {
        // Verificar autenticación
        if (!auth()->check()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes iniciar sesión para reportar una propiedad.',
                    'errors' => ['auth' => ['Usuario no autenticado']]
                ], 401);
            }
            return redirect()->route('login')->with('error', 'Debes iniciar sesión para reportar una propiedad.');
        }

        // Verificar que no reporte su propia propiedad
        if ($property->user_id === auth()->id()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No puedes reportar tu propia propiedad.',
                    'errors' => ['property' => ['No se puede auto-reportar']]
                ], 422);
            }
            return back()->withErrors(['error' => 'No puedes reportar tu propia propiedad.']);
        }

        // Verificar si ya reportó esta propiedad
        $existingReport = PropertyReport::where('property_id', $property->id)
            ->where('reporter_user_id', auth()->id())
            ->whereIn('status', ['pending', 'in_review'])
            ->first();

        if ($existingReport) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ya has reportado esta propiedad anteriormente.',
                    'errors' => ['duplicate' => ['Reporte duplicado']]
                ], 422);
            }
            return back()->withErrors(['error' => 'Ya has reportado esta propiedad anteriormente.']);
        }

        // Validar datos
        $validator = Validator::make($request->all(), $this->getValidationRules(), $this->getValidationMessages());

        if ($validator->fails()) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Errores de validación',
                    'errors' => $validator->errors()
                ], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        try {
            $validated = $validator->validated();

            // Determinar prioridad automáticamente si no se especifica
            if (!isset($validated['priority'])) {
                $validated['priority'] = $this->determinePriority($validated['category']);
            }

            // Preparar datos para crear el reporte
            $reportData = [
                'property_id' => $property->id,
                'reporter_user_id' => auth()->id(),
                'category' => $validated['category'],
                'reason' => $validated['reason'],
                'description' => $validated['description'] ?? null,
                'priority' => $validated['priority'],
                'evidence' => !empty($validated['evidence']) ? $validated['evidence'] : null,
                'status' => 'pending'
            ];

            // Crear el reporte
            $report = PropertyReport::create($reportData);

            // Log del reporte creado
            Log::info('Property report created', [
                'report_id' => $report->id,
                'property_id' => $property->id,
                'reporter_id' => auth()->id(),
                'category' => $validated['category'],
                'priority' => $validated['priority']
            ]);

            // Enviar notificación a administradores si es crítico
            if ($report->isCritical()) {
                $this->notifyAdminsOfCriticalReport($report);
            }

            // Respuesta exitosa
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Reporte enviado exitosamente. Nuestro equipo lo revisará pronto.',
                    'report' => [
                        'id' => $report->id,
                        'category' => $report->category_label,
                        'priority' => $report->priority_label,
                        'status' => $report->status_label,
                        'created_at' => $report->created_at->format('d/m/Y H:i')
                    ]
                ]);
            }

            return back()->with('success', 'Reporte enviado exitosamente. Nuestro equipo lo revisará pronto.');

        } catch (\Exception $e) {
            Log::error('Error creating property report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'property_id' => $property->id,
                'user_id' => auth()->id()
            ]);

            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error al enviar el reporte. Por favor, intenta de nuevo.',
                    'errors' => ['general' => ['Error interno del servidor']]
                ], 500);
            }

            return back()->withInput()
                ->withErrors(['error' => 'Error al enviar el reporte. Por favor, intenta de nuevo.']);
        }
    }

    /**
     * Mostrar reportes del usuario actual
     */
    public function myReports(Request $request)
    {
        if (!auth()->check()) {
            return redirect()->route('login');
        }

        $query = PropertyReport::with(['property', 'reviewer'])
            ->where('reporter_user_id', auth()->id());

        // Filtros opcionales
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        $reports = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 10));

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'reports' => $reports->map(function ($report) {
                    return [
                        'id' => $report->id,
                        'property' => [
                            'id' => $report->property->id,
                            'title' => $report->property->title,
                            'image' => $report->property->image ? asset('storage/' . $report->property->image) : null
                        ],
                        'category' => $report->category_label,
                        'reason' => $report->reason,
                        'status' => $report->status_label,
                        'priority' => $report->priority_label,
                        'created_at' => $report->created_at->format('d/m/Y H:i'),
                        'reviewed_at' => $report->reviewed_at ? $report->reviewed_at->format('d/m/Y H:i') : null,
                        'reviewer' => $report->reviewer ? $report->reviewer->name : null
                    ];
                }),
                'pagination' => [
                    'current_page' => $reports->currentPage(),
                    'last_page' => $reports->lastPage(),
                    'total' => $reports->total()
                ]
            ]);
        }

        return view('user.reports', [
            'reports' => $reports,
            'categories' => PropertyReport::CATEGORIES,
            'statuses' => PropertyReport::STATUSES
        ]);
    }

    /**
     * Mostrar un reporte específico
     */
    public function show(PropertyReport $report)
    {
        // Verificar permisos
        if (!auth()->check()) {
            return redirect()->route('login');
        }

        // Solo el reportero o un admin pueden ver el reporte
        if ($report->reporter_user_id !== auth()->id() && auth()->user()->role !== 'admin') {
            abort(403, 'No tienes permisos para ver este reporte.');
        }

        $report->load(['property', 'reporter', 'reviewer']);

        if (request()->expectsJson() || request()->ajax()) {
            return response()->json([
                'success' => true,
                'report' => [
                    'id' => $report->id,
                    'property' => [
                        'id' => $report->property->id,
                        'title' => $report->property->title,
                        'image' => $report->property->image ? asset('storage/' . $report->property->image) : null,
                        'price' => $report->property->price,
                        'city' => $report->property->city
                    ],
                    'reporter' => [
                        'name' => $report->reporter->name,
                        'email' => auth()->user()->role === 'admin' ? $report->reporter->email : null
                    ],
                    'category' => $report->category_label,
                    'reason' => $report->reason,
                    'description' => $report->description,
                    'status' => $report->status_label,
                    'priority' => $report->priority_label,
                    'evidence' => $report->evidence,
                    'admin_notes' => auth()->user()->role === 'admin' ? $report->admin_notes : null,
                    'created_at' => $report->created_at->format('d/m/Y H:i'),
                    'reviewed_at' => $report->reviewed_at ? $report->reviewed_at->format('d/m/Y H:i') : null,
                    'reviewer' => $report->reviewer ? $report->reviewer->name : null
                ]
            ]);
        }

        return view('reports.show', ['report' => $report]);
    }

    /**
     * Determinar prioridad automáticamente basada en la categoría
     */
    private function determinePriority($category)
    {
        return match($category) {
            'scam_suspicion' => 'critical',
            'fake_photos', 'false_information' => 'high',
            'wrong_price', 'duplicate_listing' => 'medium',
            'inappropriate_content', 'other' => 'low',
            default => 'medium'
        };
    }

    /**
     * Notificar a administradores sobre reportes críticos
     */
    private function notifyAdminsOfCriticalReport($report)
    {
        try {
            // Aquí puedes implementar notificaciones por email, Slack, etc.
            Log::info('Critical report notification sent', [
                'report_id' => $report->id,
                'category' => $report->category,
                'property_id' => $report->property_id
            ]);

            // Ejemplo: Enviar email a administradores
            // Mail::to(User::where('role', 'admin')->pluck('email'))
            //     ->send(new CriticalReportNotification($report));

        } catch (\Exception $e) {
            Log::error('Failed to send critical report notification', [
                'report_id' => $report->id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Obtener estadísticas de reportes para el usuario
     */
    public function getReportStats()
    {
        if (!auth()->check()) {
            return response()->json(['error' => 'No autenticado'], 401);
        }

        $userId = auth()->id();

        $stats = [
            'total' => PropertyReport::where('reporter_user_id', $userId)->count(),
            'pending' => PropertyReport::where('reporter_user_id', $userId)->where('status', 'pending')->count(),
            'in_review' => PropertyReport::where('reporter_user_id', $userId)->where('status', 'in_review')->count(),
            'resolved' => PropertyReport::where('reporter_user_id', $userId)->where('status', 'resolved')->count(),
            'dismissed' => PropertyReport::where('reporter_user_id', $userId)->where('status', 'dismissed')->count(),
        ];

        return response()->json([
            'success' => true,
            'stats' => $stats
        ]);
    }
}
