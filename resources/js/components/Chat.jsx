import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFloating, useClick, useDismiss, useInteractions, offset, flip, shift, size } from '@floating-ui/react';

const AudioPlayer = ({ message, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(message.duration || 0);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef(null);

  const formatTime = (seconds) => {
      if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
          return '0:00';
      }
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = async () => {
      if (!audioRef.current) return;
      try {
          if (isPlaying) {
              audioRef.current.pause();
              setIsPlaying(false);
          } else {
              setIsLoading(true);
              await audioRef.current.play();
              setIsPlaying(true);
              setIsLoading(false);
          }
      } catch (error) {
          console.error('Error reproduciendo audio:', error);
          setIsLoading(false);
      }
  };

  const handleLoadedMetadata = () => {
      if (audioRef.current && (!message.duration || message.duration === 0)) {
          setDuration(audioRef.current.duration);
      }
  };

  const handleTimeUpdate = () => {
      if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
      }
  };

  const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
      }
  };

  const handleSeek = (e) => {
      if (!audioRef.current || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = percent * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
  };

  return (
      <div className={`flex items-center space-x-2 sm:space-x-3 p-4 sm:p-5 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] ${isOwn ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30' : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white shadow-lg'}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <audio ref={audioRef} src={message.file_url} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} preload="metadata" />
          <button onClick={togglePlay} disabled={isLoading} className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 transform ${isHovered ? 'scale-110' : 'scale-100'} ${isOwn ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-2 border-white border-opacity-40 shadow-lg' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/40'} disabled:opacity-50 disabled:scale-100`}>
              {isLoading ? <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : isPlaying ? <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <div className="flex-1 min-w-0 space-y-2 sm:space-y-3">
              <div className="flex items-center space-x-3 sm:space-x-4">
                  <div className={`transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v1a7 7 0 1 1-14 0v-1"/>
                          <path d="M12 18v4"/>
                          <path d="M8 22h8"/>
                      </svg>
                  </div>
                  <div className={`flex-1 h-3 rounded-full cursor-pointer relative transition-all duration-300 ${isHovered ? 'h-4' : 'h-3'} ${isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={handleSeek}>
                      <div className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${isOwn ? 'bg-white bg-opacity-90 shadow-sm' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30'}`} style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}>
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-40 ${isPlaying ? 'animate-pulse' : ''}`}></div>
                      </div>
                      {isHovered && duration > 0 && (
                          <div className={`absolute top-1/2 w-4 h-4 sm:w-5 sm:h-5 rounded-full transition-all duration-300 transform -translate-y-1/2 -translate-x-1/2 shadow-xl ${isOwn ? 'bg-white border-2 border-emerald-400' : 'bg-emerald-500 border-2 border-white'}`} style={{ left: `${(currentTime / duration) * 100}%` }} />
                      )}
                  </div>
                  <div className={`text-sm sm:text-base font-mono flex-shrink-0 min-w-[4rem] sm:min-w-[5rem] text-right transition-all duration-300 ${isOwn ? 'text-white text-opacity-90' : 'text-gray-600 dark:text-gray-300'}`}>
                      <span className="font-medium">{formatTime(currentTime)}</span>
                      <span className="opacity-60"> / </span>
                      <span className="opacity-80">{formatTime(duration)}</span>
                  </div>
              </div>
              {message.metadata && (
                  <div className={`text-sm flex items-center space-x-3 transition-all duration-300 ${isOwn ? 'text-white text-opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                          <span>
                              {message.metadata.sample_rate && `${Math.round(message.metadata.sample_rate/1000)}kHz`}
                          </span>
                      </div>
                      {message.metadata.channels && (
                          <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                              </svg>
                              <span>{message.metadata.channels === 1 ? 'Mono' : 'Estéreo'}</span>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>
  );
};

const EmojiPicker = ({ messageId, onEmojiSelect, onClose, referenceElement }) => {
   const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🎉', '🤔', '🔥'];

   const { refs, floatingStyles } = useFloating({
     elements: {
       reference: referenceElement
     },
     placement: 'top-start',
     middleware: [
       offset(8),
       flip(),
       shift({ padding: 16 }),
       size({
         apply({ availableWidth, availableHeight, elements }) {
           Object.assign(elements.floating.style, {
             maxWidth: `${Math.min(availableWidth - 16, 208)}px`,
             maxHeight: `${availableHeight - 16}px`,
           });
         },
         padding: 16,
       }),
     ],
   });

   return (
     <div
       ref={refs.setFloating}
       style={floatingStyles}
       className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 w-52 sm:w-56 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95"
     >
       <div className="grid grid-cols-5 gap-2">
         {emojis.map((emoji, index) => (
           <button
             key={index}
             onClick={() => {
               onEmojiSelect(messageId, emoji);
               onClose();
             }}
             className="w-10 h-10 flex items-center justify-center text-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
           >
             {emoji}
           </button>
         ))}
       </div>
       <button
         onClick={onClose}
         className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
       >
         Cerrar
       </button>
     </div>
   );
 };

const MessageReactions = ({ message, user, hoveredMessage, showReactionPicker, setShowReactionPicker, toggleReaction, onEmojiPickerToggle }) => {
    const buttonRef = useRef(null);

    if (!((message.reactions && Object.keys(message.reactions).length > 0) || hoveredMessage === message.id)) {
        return null;
    }

    return (
        <div className="mt-3 -mb-1 relative">
            <div className="flex flex-wrap gap-2 max-w-[200px] sm:max-w-[280px] md:max-w-[350px]">
                {message.reactions && Object.keys(message.reactions).length > 0 && (
                    Object.entries(message.reactions).map(([emoji, userIds]) => {
                        const count = userIds.length;
                        const hasUserReacted = userIds.includes(user?.id);
                        return (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction(message.id, emoji)}
                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm transition-all duration-300 transform hover:scale-105 shadow-md ${
                                    hasUserReacted
                                        ? 'bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-emerald-500/20'
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-gray-200 dark:border-gray-600'
                                }`}
                            >
                                <span className="text-base">{emoji}</span>
                                <span className="font-semibold text-xs">{count}</span>
                            </button>
                        );
                    })
                )}

                {hoveredMessage === message.id && (
                    <button
                        ref={buttonRef}
                        onClick={() => onEmojiPickerToggle(message.id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30 rounded-full text-gray-600 dark:text-gray-400 transition-all duration-300 transform hover:scale-110 border border-gray-200 dark:border-gray-600 shadow-md"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                )}
            </div>

            {showReactionPicker === message.id && (
                <EmojiPicker
                    messageId={message.id}
                    onEmojiSelect={toggleReaction}
                    onClose={() => setShowReactionPicker(null)}
                    referenceElement={buttonRef.current}
                />
            )}
        </div>
    );
};

const DeleteChatModal = ({ show, onConfirm, onCancel, otherUser, isDeleting }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        ¿Eliminar conversación?
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Se eliminará toda la conversación con <span className="font-semibold">{otherUser?.name}</span>. Esta acción no se puede deshacer.
                    </p>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Eliminando...
                            </>
                        ) : 'Eliminar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RatingModal = ({ show, onClose, userId, propertyId, otherUser, onRatingSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submitRating = async () => {
      if (rating === 0) {
          setError('Por favor selecciona una calificación');
          return;
      }
      
      setIsSubmitting(true);
      setError('');
      
      try {
          const response = await fetch('/api/ratings', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: JSON.stringify({
                  rated_id: userId,
                  property_id: propertyId,
                  rating,
                  comment: comment.trim()
              })
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
              if (onRatingSubmitted) {
                  onRatingSubmitted(data.rating);
              }
              onClose();
              setRating(0);
              setComment('');
          } else {
              setError(data.message || 'Error al enviar la calificación');
          }
      } catch (error) {
          console.error('Error submitting rating:', error);
          setError('Error de conexión. Intenta nuevamente.');
      } finally {
          setIsSubmitting(false);
      }
  };

  if (!show) return null;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all duration-300 scale-100">
              <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden ring-4 ring-emerald-100 dark:ring-emerald-900/30">
                      <img src={otherUser?.avatar_url} alt={otherUser?.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      ¿Cómo fue tu experiencia con {otherUser?.name}?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                      Tu opinión ayuda a mejorar la comunidad
                  </p>
              </div>

              <div className="flex justify-center space-x-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                      <button
                          key={star}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                          className="transition-all duration-200 transform hover:scale-110 focus:outline-none"
                          type="button"
                      >
                          <svg
                              className={`w-12 h-12 transition-colors duration-200 ${
                                  star <= (hoveredStar || rating)
                                      ? 'text-yellow-400 fill-current drop-shadow-lg'
                                      : 'text-gray-300 dark:text-gray-600'
                              }`}
                              viewBox="0 0 24 24"
                          >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                      </button>
                  ))}
              </div>

              {rating > 0 && (
                  <div className="text-center mb-4">
                      <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                          {rating === 5 && '¡Excelente! 🎉'}
                          {rating === 4 && 'Muy buena experiencia 👍'}
                          {rating === 3 && 'Buena experiencia 👌'}
                          {rating === 2 && 'Puede mejorar 😐'}
                          {rating === 1 && 'Mala experiencia 😞'}
                      </p>
                  </div>
              )}

              <div className="mb-4">
                  <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Cuéntanos más sobre tu experiencia (opcional)"
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all duration-300"
                      rows="4"
                      maxLength="500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      {comment.length}/500 caracteres
                  </p>
              </div>

              {error && (
                  <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
              )}

              <div className="flex space-x-3">
                  <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                      disabled={isSubmitting}
                  >
                      Ahora no
                  </button>
                  <button
                      onClick={submitRating}
                      disabled={rating === 0 || isSubmitting}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                      {isSubmitting ? (
                          <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Enviando...
                          </span>
                      ) : 'Enviar Calificación'}
                  </button>
              </div>
          </div>
      </div>
  );
};

const RatingNotification = ({ show, onRate, onDismiss, otherUser }) => {
  if (!show) return null;

  return (
      <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl shadow-lg animate-slideDown">
          <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                  </div>
              </div>
              <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                      ¿Qué tal tu conversación?
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                      Califica tu experiencia con {otherUser?.name}
                  </p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                      onClick={onDismiss}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                      title="Cerrar"
                  >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>
                  <button
                      onClick={onRate}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                      Calificar
                  </button>
              </div>
          </div>
      </div>
  );
};

function Chat() {
  const [currentChat, setCurrentChat] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState(null);
  const [errors, setErrors] = useState({});
  const [targetConversationId, setTargetConversationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRatingNotification, setShowRatingNotification] = useState(false);
  const [ratingData, setRatingData] = useState({
      userId: null,
      propertyId: null,
      canRate: false,
      hasRated: false
  });
  const [hasCheckedRating, setHasCheckedRating] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
      const handleResize = () => {
          const mobile = window.innerWidth < 768;
          setIsMobile(mobile);
          if (!mobile) {
              setShowSidebar(true);
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadUserData = useCallback(async () => {
      try {
          const response = await fetch('/api/user', {
              headers: {
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          if (!response.ok) throw new Error('Error al cargar datos del usuario');
          const userData = await response.json();
          setUser(userData.user);
      } catch (error) {
          console.error('Error loading user data:', error);
          setErrors({ general: 'Error al cargar los datos del usuario' });
      }
  }, []);

  const loadConversations = useCallback(async () => {
      try {
          setIsLoading(true);
          const response = await fetch('/api/conversations', {
              headers: {
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          if (!response.ok) throw new Error('Error al cargar conversaciones');
          const data = await response.json();
          setConversations(data.conversations || []);
      } catch (error) {
          console.error('Error loading conversations:', error);
          setErrors({ general: 'Error al cargar las conversaciones' });
      } finally {
          setIsLoading(false);
      }
  }, []);

  const markMessagesAsRead = useCallback(async (conversationId) => {
      try {
          await fetch(`/api/conversations/${conversationId}/mark-read`, {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
      } catch (error) {
          console.error('Error marking messages as read:', error);
      }
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
      try {
          const response = await fetch(`/api/conversations/${conversationId}/messages`, {
              headers: {
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          if (!response.ok) throw new Error('Error al cargar mensajes');
          const data = await response.json();
          setMessages(data.messages || []);
          markMessagesAsRead(conversationId);
      } catch (error) {
          console.error('Error loading messages:', error);
          setErrors({ general: 'Error al cargar los mensajes' });
      }
  }, [markMessagesAsRead]);

  const checkShouldShowRating = useCallback(async () => {
      if (!currentChat || !user || hasCheckedRating) return;
      
      try {
          const response = await fetch('/api/ratings/should-show-prompt', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: JSON.stringify({
                  user_id: currentChat.other_user_id,
                  property_id: currentChat.property_id
              })
          });
          
          const data = await response.json();
          
          if (data.success && data.should_show) {
              setRatingData({
                  userId: currentChat.other_user_id,
                  propertyId: currentChat.property_id,
                  canRate: true,
                  hasRated: false
              });
              setShowRatingNotification(true);
              setHasCheckedRating(true);
          }
      } catch (error) {
          console.error('Error checking rating prompt:', error);
      }
  }, [currentChat, user, hasCheckedRating]);

  const detectKeywords = useCallback(async (messageText) => {
      if (!messageText.trim() || !currentChat) return;
      
      try {
          const response = await fetch('/api/ratings/detect-keywords', {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: JSON.stringify({ message: messageText })
          });
          
          const data = await response.json();
          
          if (data.success && data.should_show_rating && !hasCheckedRating) {
              checkShouldShowRating();
          }
      } catch (error) {
          console.error('Error detecting keywords:', error);
      }
  }, [currentChat, hasCheckedRating, checkShouldShowRating]);

  const deleteChat = useCallback(async (conversation) => {
      if (!conversation) return;
      
      try {
          setIsDeleting(true);
          console.log('🗑️ Eliminando conversación:', conversation);
          
          const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}`;
          
          console.log('🔑 ID de conversación:', conversationId);
          
          const response = await fetch(`/api/conversations/${conversationId}`, {
              method: 'DELETE',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
              console.log('✅ Conversación eliminada exitosamente');
              
              setConversations(prev => prev.filter(conv => {
                  const convId = `property_${conv.property_id}_users_${Math.min(conv.other_user_id, user.id)}_${Math.max(conv.other_user_id, user.id)}`;
                  return convId !== conversationId;
              }));
              
              if (currentChat?.id === conversationId) {
                  setCurrentChat(null);
                  setMessages([]);
              }
              
              await loadConversations();
              
              setShowDeleteModal(false);
              setChatToDelete(null);
          } else {
              console.error('❌ Error del servidor:', data.message);
              setErrors({ delete: data.message || 'Error al eliminar la conversación' });
          }
          
      } catch (error) {
          console.error('❌ Error al eliminar chat:', error);
          setErrors({ delete: 'Error de conexión al eliminar la conversación' });
      } finally {
          setIsDeleting(false);
      }
  }, [currentChat, user, loadConversations]);

  const handleDeleteClick = useCallback((conversation, e) => {
      e.stopPropagation();
      console.log('🗑️ Solicitando eliminación de:', conversation);
      setChatToDelete(conversation);
      setShowDeleteModal(true);
  }, []);

  const selectConversation = useCallback((conversation) => {
      if (!user) return;
      const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}`;
      const conversationWithId = { ...conversation, id: conversationId };
      setCurrentChat(conversationWithId);
      loadMessages(conversationId);
      setErrors({});
      setHasCheckedRating(false);
      setShowRatingNotification(false);
      if (isMobile) {
          setShowSidebar(false);
      }
  }, [user, loadMessages, isMobile]);

  const pollForNewMessages = useCallback(async () => {
      if (!currentChat || !user) return;
      try {
          const response = await fetch(`/api/conversations/${currentChat.id}/messages`, {
              headers: {
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          if (response.ok) {
              const data = await response.json();
              const newMessages = data.messages || [];
              setMessages(prevMessages => {
                  if (newMessages.length !== prevMessages.length) {
                      if (newMessages.length > prevMessages.length) {
                          markMessagesAsRead(currentChat.id);
                      }
                      return newMessages;
                  }
                  return prevMessages;
              });
          }
      } catch (error) {
          console.error('Error polling messages:', error);
      }
  }, [currentChat, user, markMessagesAsRead]);

  const pollForConversationUpdates = useCallback(async () => {
      if (!user) return;
      try {
          const response = await fetch('/api/conversations', {
              headers: {
                  'Accept': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              }
          });
          if (response.ok) {
              const data = await response.json();
              setConversations(data.conversations || []);
          }
      } catch (error) {
          console.error('Error polling conversations:', error);
      }
  }, [user]);

  const sendMessage = useCallback(async (e) => {
      e.preventDefault();
      if ((!newMessage.trim() && !selectedFile) || !currentChat || isSending) return;
      
      const messageText = newMessage.trim();
      
      try {
          setIsSending(true);
          setErrors({});
          const formData = new FormData();
          formData.append('message', messageText || '');
          formData.append('receiver_id', currentChat.other_user_id);
          if (currentChat.property_id) {
              formData.append('property_id', currentChat.property_id);
          }
          if (selectedFile) {
              formData.append('file', selectedFile);
          }
          const response = await fetch('/api/messages', {
              method: 'POST',
              headers: {
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: formData
          });
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Error al enviar mensaje');
          }
          const data = await response.json();
          setMessages(prev => [...prev, data.message]);
          setNewMessage('');
          setSelectedFile(null);
          setShowFilePreview(false);
          
          if (messageText) {
              detectKeywords(messageText);
          }
      } catch (error) {
          console.error('Error sending message:', error);
          setErrors({ message: error.message });
      } finally {
          setIsSending(false);
          messageInputRef.current?.focus();
      }
  }, [newMessage, selectedFile, currentChat, isSending, detectKeywords]);

  const handleFileSelect = useCallback((e) => {
      const file = e.target.files[0];
      if (file) {
          if (file.size > 5 * 1024 * 1024) {
              setErrors({ file: 'El archivo no puede ser mayor a 5MB' });
              return;
          }
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(file.type)) {
              setErrors({ file: 'Tipo de archivo no permitido. Solo se permiten imágenes, PDF, TXT y documentos de Word.' });
              return;
          }
          setSelectedFile(file);
          setShowFilePreview(true);
          setErrors({});
      }
  }, []);

  const removeFile = useCallback(() => {
      setSelectedFile(null);
      setShowFilePreview(false);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }, []);

  const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const formatTime = useCallback((timestamp) => {
      const date = new Date(timestamp);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
          return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      }
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }, []);

  const startVoiceRecording = useCallback(async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          let mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/webm';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/mp4';
          }
          if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = '';
          }
          const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
          const audioChunks = [];
          mediaRecorder.ondataavailable = (event) => {
              audioChunks.push(event.data);
          };
          mediaRecorder.onstop = () => {
              const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
              let fileName = 'voice-message.webm';
              let fileType = mimeType || 'audio/webm';
              if (mimeType.includes('mp4')) {
                  fileName = 'voice-message.mp4';
              }
              const audioFile = new File([audioBlob], fileName, { type: fileType });
              setSelectedFile(audioFile);
              setShowFilePreview(true);
              stream.getTracks().forEach(track => track.stop());
          };
          mediaRecorder.start();
          setIsRecording(true);
          setVoiceRecorder(mediaRecorder);
          setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                  stopVoiceRecording();
              }
          }, 60000);
      } catch (error) {
          console.error('Error accessing microphone:', error);
          setErrors({ voice: 'No se pudo acceder al micrófono' });
      }
  }, []);

  const stopVoiceRecording = useCallback(() => {
      if (voiceRecorder && voiceRecorder.state === 'recording') {
          voiceRecorder.stop();
          setIsRecording(false);
          setVoiceRecorder(null);
      }
  }, [voiceRecorder]);

  const addReaction = useCallback(async (messageId, emoji) => {
      try {
          const response = await fetch(`/messages/${messageId}/reactions`, {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: JSON.stringify({ emoji })
          });
          if (response.ok) {
              const data = await response.json();
              setMessages(prevMessages => prevMessages.map(msg => msg.id === messageId ? { ...msg, reactions: data.reactions } : msg));
          }
      } catch (error) {
          console.error('Error adding reaction:', error);
      }
  }, []);

  const removeReaction = useCallback(async (messageId, emoji) => {
      try {
          const response = await fetch(`/messages/${messageId}/reactions`, {
              method: 'DELETE',
              headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'X-Requested-With': 'XMLHttpRequest',
                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
              },
              body: JSON.stringify({ emoji })
          });
          if (response.ok) {
              const data = await response.json();
              setMessages(prevMessages => prevMessages.map(msg => msg.id === messageId ? { ...msg, reactions: data.reactions } : msg));
          }
      } catch (error) {
          console.error('Error removing reaction:', error);
      }
  }, []);

  const toggleReaction = useCallback(async (messageId, emoji) => {
      const message = messages.find(msg => msg.id === messageId);
      if (!message) return;
      const reactions = message.reactions || {};
      const userIds = reactions[emoji] || [];
      const hasUserReacted = userIds.includes(user?.id);
      if (hasUserReacted) {
          await removeReaction(messageId, emoji);
      } else {
          await addReaction(messageId, emoji);
      }
  }, [messages, user?.id, addReaction, removeReaction]);

  const shareLocation = useCallback(() => {
      if (!navigator.geolocation) {
          setErrors({ location: 'La geolocalización no está soportada en este navegador' });
          return;
      }
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                  const formData = new FormData();
                  formData.append('receiver_id', currentChat.other_user_id);
                  formData.append('property_id', currentChat.property_id);
                  formData.append('message', `Ubicación compartida: ${latitude}, ${longitude}`);
                  formData.append('type', 'location');
                  formData.append('metadata', JSON.stringify({ latitude, longitude, accuracy: position.coords.accuracy }));
                  const response = await fetch('/api/messages', {
                      method: 'POST',
                      headers: {
                          'X-Requested-With': 'XMLHttpRequest',
                          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                      },
                      body: formData
                  });
                  if (response.ok) {
                      const data = await response.json();
                      setMessages(prev => [...prev, data.message]);
                  }
              } catch (error) {
                  console.error('Error sending location:', error);
                  setErrors({ location: 'Error al compartir ubicación' });
              } finally {
                  setIsGettingLocation(false);
              }
          },
          (error) => {
              console.error('Geolocation error:', error);
              setErrors({ location: 'No se pudo obtener la ubicación' });
              setIsGettingLocation(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
      );
  }, [currentChat]);

  const handleOpenRatingModal = useCallback(() => {
      setShowRatingNotification(false);
      setShowRatingModal(true);
  }, []);

  const handleCloseRatingModal = useCallback(() => {
      setShowRatingModal(false);
  }, []);

  const handleDismissNotification = useCallback(() => {
      setShowRatingNotification(false);
      setHasCheckedRating(true);
  }, []);

  const handleRatingSubmitted = useCallback((ratingResult) => {
      console.log('Calificación enviada:', ratingResult);
      setShowRatingModal(false);
      setShowRatingNotification(false);
      setHasCheckedRating(true);
  }, []);

  useEffect(() => {
      loadUserData();
      loadConversations();
  }, [loadUserData, loadConversations]);

  useEffect(() => {
      scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
      const urlParams = new URLSearchParams(window.location.search);
      const conversationFromUrl = urlParams.get('conversation');
      if (conversationFromUrl) {
          setTargetConversationId(conversationFromUrl);
      }
  }, []);

  useEffect(() => {
      if (targetConversationId && conversations.length > 0 && !currentChat && user) {
          const foundConversation = conversations.find(conv => {
              const convId = `property_${conv.property_id}_users_${Math.min(conv.other_user.id, user.id)}_${Math.max(conv.other_user.id, user.id)}`;
              return convId === targetConversationId;
          });
          if (foundConversation) {
              selectConversation(foundConversation);
              window.history.replaceState({}, '', '/chat');
          }
      }
  }, [conversations, targetConversationId, currentChat, user, selectConversation]);

  useEffect(() => {
      let messageInterval;
      let conversationInterval;
      if (currentChat && user) {
          messageInterval = setInterval(() => {
              pollForNewMessages();
          }, 10000);
          conversationInterval = setInterval(() => {
              pollForConversationUpdates();
          }, 30000);
      }
      return () => {
          if (messageInterval) clearInterval(messageInterval);
          if (conversationInterval) clearInterval(conversationInterval);
      };
  }, [currentChat, user, pollForNewMessages, pollForConversationUpdates]);

  useEffect(() => {
      const handleFocus = () => {
          if (currentChat) {
              pollForNewMessages();
              pollForConversationUpdates();
          }
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
  }, [currentChat, pollForNewMessages, pollForConversationUpdates]);

  useEffect(() => {
      if (messages.length >= 8 && currentChat && user && !hasCheckedRating) {
          checkShouldShowRating();
      }
  }, [messages.length, currentChat, user, hasCheckedRating, checkShouldShowRating]);

  const filteredConversations = conversations.filter(conv =>
      conv.other_user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.other_user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              <div className="text-center">
                  <div className="relative mx-auto mb-6">
                      <div className="w-20 h-20 border-4 border-emerald-200 dark:border-emerald-800 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-2 w-16 h-16 border-4 border-transparent border-b-emerald-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent animate-pulse mb-2">
                      Cargando Chat
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">Preparando tu experiencia de mensajería...</p>

                  <div className="flex justify-center space-x-2 mt-6">
                      {[0, 1, 2].map((i) => (
                          <div
                              key={i}
                              className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.2}s` }}
                          />
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="h-screen bg-gradient-to-br from-gray-50 via-emerald-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex overflow-hidden pt-16">
          {isMobile && showSidebar && (
              <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm"
                  onClick={() => setShowSidebar(false)}
              />
          )}

          <div className={`${isMobile ? 'fixed' : 'relative'} ${showSidebar ? 'translate-x-0' : '-translate-x-full'} ${isMobile ? 'w-full max-w-sm' : 'w-80'} bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 ease-in-out z-50 md:translate-x-0 shadow-2xl`}>
              <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/80 to-emerald-50/80 dark:from-gray-800/80 dark:to-emerald-900/20">
                  <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                          </div>
                          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 via-emerald-700 to-emerald-600 dark:from-white dark:via-emerald-300 dark:to-emerald-400 bg-clip-text text-transparent">
                              Mensajes
                          </h2>
                      </div>
                      {isMobile && (
                          <button
                              onClick={() => setShowSidebar(false)}
                              className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                          >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                          </button>
                      )}
                  </div>
                  <div className="relative group">
                      <input
                          type="text"
                          placeholder="Buscar conversaciones..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 shadow-sm group-hover:shadow-md"
                      />
                      <svg className="absolute left-4 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                      <div className="p-6 sm:p-8 text-center text-gray-500 dark:text-gray-400">
                          <svg className="mx-auto h-12 w-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p className="text-sm">No tienes conversaciones aún</p>
                      </div>
                  ) : (
                      filteredConversations.map((conversation) => (
                          <div
                              key={conversation.id}
                              onClick={() => selectConversation(conversation)}
                              className={`relative p-4 sm:p-5 border-b border-gray-200/30 dark:border-gray-700/30 cursor-pointer transition-all duration-300 flex items-center space-x-4 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-blue-50/50 dark:hover:from-emerald-900/10 dark:hover:to-blue-900/10 ${currentChat?.id === `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}` ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/20 shadow-inner' : ''} group`}
                          >
                              <button
                                  onClick={(e) => handleDeleteClick(conversation, e)}
                                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 z-10 transform hover:scale-110"
                                  title="Eliminar conversación"
                              >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                              </button>

                              <div className="relative">
                                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-200 dark:ring-gray-600 shadow-lg">
                                      <img src={conversation.other_user.avatar_url} alt={conversation.other_user.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                              </div>
                              <div className="flex-1 min-w-0 pr-8">
                                  <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">{conversation.other_user.name} {conversation.other_user.last_name}</h4>
                                      {conversation.last_message && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{formatTime(conversation.last_message.created_at)}</span>
                                      )}
                                  </div>
                                  {conversation.last_message && (
                                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate mb-1">{conversation.last_message.type === 'text' ? conversation.last_message.message : `📎 ${conversation.last_message.file_name || 'Archivo'}`}</p>
                                  )}
                                  {conversation.property && (
                                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                          {conversation.property.title}
                                      </p>
                                  )}
                              </div>
                              {conversation.unread_count > 0 && (
                                  <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 shadow-lg animate-pulse">
                                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>

          <div className="flex-1 flex flex-col bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm min-w-0 shadow-xl">
              {currentChat ? (
                  <>
                      <div className="p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-emerald-50/90 dark:from-gray-800/90 dark:to-emerald-900/20">
                          <div className="flex items-center space-x-4 sm:space-x-5">
                              {isMobile && (
                                  <button
                                      onClick={() => setShowSidebar(true)}
                                      className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg -ml-2"
                                  >
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                      </svg>
                                  </button>
                              )}
                              <div className="relative">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-700 shadow-lg">
                                      <img src={currentChat.other_user.avatar_url} alt={currentChat.other_user.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                              </div>
                              <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-gray-900 dark:text-white text-lg sm:text-xl truncate">{currentChat.other_user.name} {currentChat.other_user.last_name}</h3>
                                  {currentChat.property && (
                                      <p className="text-sm sm:text-base text-emerald-600 dark:text-emerald-400 font-medium truncate flex items-center">
                                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                                          {currentChat.property.title}
                                      </p>
                                  )}
                              </div>
                          </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-4">
                          {messages.length === 0 ? (
                              <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 px-4">
                                  <div>
                                      <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                      </svg>
                                      <p className="text-base sm:text-lg font-medium mb-2">No hay mensajes aún</p>
                                      <p className="text-sm">¡Envía el primer mensaje para comenzar la conversación!</p>
                                  </div>
                              </div>
                          ) : (
                              messages.map((message, index) => {
                                  const isOwn = message.sender_id === user?.id;
                                  const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                                  return (
                                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4 sm:mt-6' : 'mt-1'}`}>
                                          <div className={`flex items-end space-x-1 sm:space-x-2 max-w-[85%] sm:max-w-[75%] md:max-w-[60%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                              {!isOwn && showAvatar && (
                                                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0">
                                                      <img src={currentChat.other_user.avatar_url} alt={currentChat.other_user.name} className="w-full h-full object-cover" />
                                                  </div>
                                              )}
                                              {!isOwn && !showAvatar && <div className="w-6 sm:w-8" />}
                                              <div
                                                  className={`rounded-2xl px-4 py-3 sm:px-5 sm:py-3 ${message.reactions && Object.keys(message.reactions).length > 0 ? 'min-w-[160px] sm:min-w-[200px]' : ''} ${isOwn ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-br-md shadow-xl shadow-emerald-500/30' : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white rounded-bl-md shadow-lg'}`}
                                                  onMouseEnter={() => setHoveredMessage(message.id)}
                                                  onMouseLeave={() => setHoveredMessage(null)}
                                              >
                                                  {message.type === 'text' && <p className="break-words text-sm sm:text-base">{message.message}</p>}
                                                  {message.type === 'image' && (
                                                      <div>
                                                          <img src={message.file_url} alt={message.file_name} className="max-w-full h-auto rounded-lg mb-2" style={{ maxHeight: '300px' }} />
                                                          {message.message && <p className="break-words text-sm sm:text-base">{message.message}</p>}
                                                      </div>
                                                  )}
                                                  {message.type === 'file' && (
                                                      <div className="flex items-center space-x-2">
                                                          <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                                          </svg>
                                                          <div className="min-w-0">
                                                              <p className="font-medium text-sm sm:text-base truncate">{message.file_name}</p>
                                                              <p className="text-xs opacity-75">{message.file_size_formatted}</p>
                                                          </div>
                                                      </div>
                                                  )}
                                                  {message.type === 'voice' && <AudioPlayer message={message} isOwn={isOwn} />}

                                                  <MessageReactions
                                                       message={message}
                                                       user={user}
                                                       hoveredMessage={hoveredMessage}
                                                       showReactionPicker={showReactionPicker}
                                                       setShowReactionPicker={setShowReactionPicker}
                                                       toggleReaction={toggleReaction}
                                                       onEmojiPickerToggle={(messageId) => setShowReactionPicker(showReactionPicker === messageId ? null : messageId)}
                                                   />

                                                  <div className="flex items-center justify-end mt-1 space-x-1">
                                                      <span className="text-xs opacity-75">{formatTime(message.created_at)}</span>
                                                      {isOwn && message.read_at && <span className="text-xs opacity-75">✓✓</span>}
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                          <div ref={messagesEndRef} />
                      </div>

                      <div className="p-4 sm:p-6 border-t border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-white/90 to-emerald-50/90 dark:from-gray-800/90 dark:to-emerald-900/20">
                          {showRatingNotification && (
                              <RatingNotification
                                  show={showRatingNotification}
                                  onRate={handleOpenRatingModal}
                                  onDismiss={handleDismissNotification}
                                  otherUser={currentChat.other_user}
                              />
                          )}

                          {showFilePreview && selectedFile && (
                              <div className="mb-4 sm:mb-5 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/50 flex items-center justify-between shadow-lg">
                                  <div className="flex items-center space-x-3 min-w-0">
                                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                          </svg>
                                      </div>
                                      <div className="min-w-0">
                                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</p>
                                          <p className="text-xs text-emerald-600 dark:text-emerald-400">Archivo listo para enviar</p>
                                      </div>
                                  </div>
                                  <button onClick={removeFile} className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0 ml-2">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                  </button>
                              </div>
                          )}

                          {Object.entries(errors).map(([key, error]) => error && (
                              <div key={key} className="mb-3 sm:mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                              </div>
                          ))}

                          <form onSubmit={sendMessage} className="flex items-end space-x-3">
                              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,audio/*,.webm,.mp4" />

                              <div className="flex space-x-2 flex-shrink-0">
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl group">
                                      <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                      </svg>
                                  </button>
                                  <button type="button" onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`p-3 transition-all duration-300 rounded-xl group ${isRecording ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                                      <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {isRecording ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
                                      </svg>
                                  </button>
                                  <button type="button" onClick={shareLocation} disabled={isGettingLocation} className="p-3 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 transition-all duration-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl group disabled:opacity-50">
                                      {isGettingLocation ? (
                                          <div className="w-6 h-6 animate-spin">
                                              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                              </svg>
                                          </div>
                                      ) : (
                                          <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                      )}
                                  </button>
                              </div>

                              <div className="flex-1 min-w-0">
                                  <textarea
                                      ref={messageInputRef}
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      placeholder="Escribe un mensaje..."
                                      rows="1"
                                      className="w-full px-4 py-3 sm:px-5 sm:py-3 text-sm sm:text-base border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none transition-all duration-300 shadow-sm hover:shadow-md"
                                      onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              sendMessage(e);
                                          }
                                      }}
                                  />
                              </div>

                              <button
                                  type="submit"
                                  disabled={(!newMessage.trim() && !selectedFile) || isSending}
                                  className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex-shrink-0 shadow-lg hover:shadow-xl transform hover:scale-105 group"
                              >
                                  {isSending ? (
                                      <div className="w-6 h-6 animate-spin">
                                          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                      </div>
                                  ) : (
                                      <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                      </svg>
                                  )}
                              </button>
                          </form>
                      </div>
                  </>
              ) : (
                  <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 p-4">
                      {isMobile && (
                          <button
                              onClick={() => setShowSidebar(true)}
                              className="fixed top-20 left-4 p-2 bg-emerald-500 text-white rounded-lg shadow-lg z-30"
                          >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                          </button>
                      )}
                      <div>
                          <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20 mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <h3 className="text-lg sm:text-xl font-medium mb-2">Selecciona una conversación</h3>
                          <p className="text-sm sm:text-base">Elige una conversación del panel {isMobile ? 'de menú' : 'izquierdo'} para comenzar a chatear</p>
                      </div>
                  </div>
              )}
          </div>

          <RatingModal
              show={showRatingModal}
              onClose={handleCloseRatingModal}
              userId={ratingData.userId}
              propertyId={ratingData.propertyId}
              otherUser={currentChat?.other_user}
              onRatingSubmitted={handleRatingSubmitted}
          />

          <DeleteChatModal
              show={showDeleteModal}
              onConfirm={() => deleteChat(chatToDelete)}
              onCancel={() => {
                  setShowDeleteModal(false);
                  setChatToDelete(null);
              }}
              otherUser={chatToDelete?.other_user}
              isDeleting={isDeleting}
          />
      </div>
  );
}

export default Chat;