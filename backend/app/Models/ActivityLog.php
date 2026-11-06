<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'action', 'subject_type', 'subject_id', 'details', 'ip'];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Write one audit entry.
     *
     * @param  Model|string|null  $subject  a model, or a short subject name such as "categories"
     */
    public static function record(string $action, Model|string|null $subject = null, array $details = [], ?User $user = null): self
    {
        $user ??= auth()->user();

        $subjectType = null;
        $subjectId = null;
        if ($subject instanceof Model) {
            $subjectType = class_basename($subject);
            $subjectId = $subject->getKey();
        } elseif (is_string($subject)) {
            $subjectType = $subject;
        }

        return self::create([
            'user_id' => $user?->id,
            'action' => $action,
            'subject_type' => $subjectType,
            'subject_id' => $subjectId,
            'details' => $details ?: null,
            'ip' => request()?->ip(),
        ]);
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'details' => $this->details,
            'ip' => $this->ip,
            'user' => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
