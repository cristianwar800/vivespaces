<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\UserVerification;
use App\Models\User;
use App\Services\OCRService;

class CleanCorruptVerifications extends Command
{
    protected $signature = 'verification:clean-corrupt';
    protected $description = 'Limpia sesiones de verificación con datos que no coinciden con el usuario';

    protected $ocrService;

    public function __construct(OCRService $ocrService)
    {
        parent::__construct();
        $this->ocrService = $ocrService;
    }

    public function handle()
    {
        $this->info('🔍 Buscando sesiones de verificación corruptas...');

        $sessions = UserVerification::whereIn('status', ['in_progress', 'completed'])
            ->with('user')
            ->get();

        $corruptCount = 0;
        $validCount = 0;

        foreach ($sessions as $session) {
            if (!$session->user) {
                $this->warn("⚠️ Sesión {$session->id} sin usuario - Invalidando...");
                $session->update(['status' => 'invalidated']);
                $corruptCount++;
                continue;
            }

            $userName = $session->user->name . ' ' . $session->user->last_name;
            $stepsData = $session->steps_data ?? [];

            // Verificar paso 1 (Face ID + INE)
            if (isset($stepsData['1']) && isset($stepsData['1']['ocr_text'])) {
                $ocrText = $stepsData['1']['ocr_text'];

                $nameMatch = $this->ocrService->validateNameMatch($ocrText, $userName);
                $matchPercentage = $nameMatch['match_percentage'];

                if ($matchPercentage < 60) {
                    $this->warn("❌ Sesión corrupta encontrada:");
                    $this->line("   ID: {$session->id}");
                    $this->line("   Usuario: {$userName} (ID: {$session->user_id})");
                    $this->line("   Match: {$matchPercentage}%");
                    $this->line("   Estado: {$session->status}");

                    $session->update(['status' => 'invalidated']);
                    $corruptCount++;
                } else {
                    $validCount++;
                }
            } else {
                $validCount++;
            }
        }

        $this->info("\n📊 Resumen:");
        $this->info("   ✅ Sesiones válidas: {$validCount}");
        $this->info("   ❌ Sesiones corruptas invalidadas: {$corruptCount}");
        $this->info("\n✅ Limpieza completada");

        return Command::SUCCESS;
    }
}
