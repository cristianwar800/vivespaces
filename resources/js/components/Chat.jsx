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
      <div className={`flex items-center space-x-2 sm:space-x-3 p-3 sm:p-4 rounded-2xl transition-all duration-200 ${isOwn ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-md'}`} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          <audio ref={audioRef} src={message.file_url} onLoadedMetadata={handleLoadedMetadata} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} preload="metadata" />
          <button onClick={togglePlay} disabled={isLoading} className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 transform ${isHovered ? 'scale-110' : 'scale-100'} ${isOwn ? 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-2 border-white border-opacity-40' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'} disabled:opacity-50 disabled:scale-100`}>
              {isLoading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : isPlaying ? <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`transition-all duration-200 ${isPlaying ? 'animate-pulse' : ''}`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v1a7 7 0 1 1-14 0v-1"/>
                          <path d="M12 18v4"/>
                          <path d="M8 22h8"/>
                      </svg>
                  </div>
                  <div className={`flex-1 h-2 rounded-full cursor-pointer relative transition-all duration-200 ${isHovered ? 'h-3' : 'h-2'} ${isOwn ? 'bg-white bg-opacity-20' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={handleSeek}>
                      <div className={`h-full rounded-full transition-all duration-200 relative overflow-hidden ${isOwn ? 'bg-white bg-opacity-90 shadow-sm' : 'bg-emerald-500 shadow-md shadow-emerald-500/30'}`} style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}>
                          <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 ${isPlaying ? 'animate-pulse' : ''}`}></div>
                      </div>
                      {isHovered && duration > 0 && (
                          <div className={`absolute top-1/2 w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-200 transform -translate-y-1/2 -translate-x-1/2 shadow-lg ${isOwn ? 'bg-white border-2 border-emerald-400' : 'bg-emerald-500 border-2 border-white'}`} style={{ left: `${(currentTime / duration) * 100}%` }} />
                      )}
                  </div>
                  <div className={`text-xs sm:text-sm font-mono flex-shrink-0 min-w-[3rem] sm:min-w-[4rem] text-right transition-all duration-200 ${isOwn ? 'text-white text-opacity-90' : 'text-gray-600 dark:text-gray-300'}`}>
                      <span className="font-medium">{formatTime(currentTime)}</span>
                      <span className="opacity-60"> / </span>
                      <span className="opacity-80">{formatTime(duration)}</span>
                  </div>
              </div>
              {message.metadata && (
                  <div className={`text-xs flex items-center space-x-2 transition-all duration-200 ${isOwn ? 'text-white text-opacity-70' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                          <span>
                              {message.metadata.sample_rate && `${Math.round(message.metadata.sample_rate/1000)}kHz`}
                          </span>
                      </div>
                      {message.metadata.channels && (
                          <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
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
       className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50 w-48 sm:w-52"
     >
       <div className="grid grid-cols-5 gap-1">
         {emojis.map((emoji, index) => (
           <button
             key={index}
             onClick={() => {
               onEmojiSelect(messageId, emoji);
               onClose();
             }}
             className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-200"
           >
             {emoji}
           </button>
         ))}
       </div>
       <button
         onClick={onClose}
         className="w-full mt-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-t border-gray-200 dark:border-gray-600"
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
         <div className="mt-2 -mb-1 relative">
             <div className="flex flex-wrap gap-1 max-w-[180px] sm:max-w-[250px] md:max-w-[300px]">
                 {message.reactions && Object.keys(message.reactions).length > 0 && (
                     Object.entries(message.reactions).map(([emoji, userIds]) => {
                         const count = userIds.length;
                         const hasUserReacted = userIds.includes(user?.id);
                         return (
                             <button
                                 key={emoji}
                                 onClick={() => toggleReaction(message.id, emoji)}
                                 className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-xs transition-all duration-200 shadow-sm ${
                                     hasUserReacted
                                         ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                         : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                 }`}
                             >
                                 <span className="text-sm">{emoji}</span>
                                 <span className="font-medium text-xs">{count}</span>
                             </button>
                         );
                     })
                 )}

                 {hoveredMessage === message.id && (
                     <button
                         ref={buttonRef}
                         onClick={() => onEmojiPickerToggle(message.id)}
                         className="inline-flex items-center justify-center w-7 h-7 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400 transition-colors duration-200 border border-gray-200 dark:border-gray-600"
                     >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const selectConversation = useCallback((conversation) => {
      if (!user) return;
      const conversationId = `property_${conversation.property_id}_users_${Math.min(conversation.other_user_id, user.id)}_${Math.max(conversation.other_user_id, user.id)}`;
      const conversationWithId = { ...conversation, id: conversationId };
      setCurrentChat(conversationWithId);
      loadMessages(conversationId);
      setErrors({});
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
      try {
          setIsSending(true);
          setErrors({});
          const formData = new FormData();
          formData.append('message', newMessage.trim() || '');
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
      } catch (error) {
          console.error('Error sending message:', error);
          setErrors({ message: error.message });
      } finally {
          setIsSending(false);
          messageInputRef.current?.focus();
      }
  }, [newMessage, selectedFile, currentChat, isSending]);

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

  const filteredConversations = conversations.filter(conv =>
      conv.other_user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.other_user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Cargando chat...</p>
              </div>
          </div>
      );
  }

  return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden pt-16">
          {/* Mobile Overlay */}
          {isMobile && showSidebar && (
              <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                  onClick={() => setShowSidebar(false)}
              />
          )}

          {/* Sidebar */}
          <div className={`${isMobile ? 'fixed' : 'relative'} ${showSidebar ? 'translate-x-0' : '-translate-x-full'} ${isMobile ? 'w-full max-w-sm' : 'w-80'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out z-50 md:translate-x-0`}>
              <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Mensajes</h2>
                      {isMobile && (
                          <button
                              onClick={() => setShowSidebar(false)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                          </button>
                      )}
                  </div>
                  <div className="relative">
                      <input
                          type="text"
                          placeholder="Buscar conversaciones..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className={`p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors duration-200 flex items-center space-x-3 ${currentChat?.id === conversation.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                          >
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={conversation.other_user.avatar_url} alt={conversation.other_user.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-1">
                                      <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">{conversation.other_user.name} {conversation.other_user.last_name}</h4>
                                      {conversation.last_message && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{formatTime(conversation.last_message.created_at)}</span>
                                      )}
                                  </div>
                                  {conversation.last_message && (
                                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{conversation.last_message.type === 'text' ? conversation.last_message.message : `📎 ${conversation.last_message.file_name || 'Archivo'}`}</p>
                                  )}
                                  {conversation.property && (
                                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">📍 {conversation.property.title}</p>
                                  )}
                              </div>
                              {conversation.unread_count > 0 && (
                                  <div className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-medium flex-shrink-0">
                                      {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                  </div>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-w-0">
              {currentChat ? (
                  <>
                      {/* Chat Header */}
                      <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          <div className="flex items-center space-x-3 sm:space-x-4">
                              {isMobile && (
                                  <button
                                      onClick={() => setShowSidebar(true)}
                                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 -ml-2"
                                  >
                                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                      </svg>
                                  </button>
                              )}
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0">
                                  <img src={currentChat.other_user.avatar_url} alt={currentChat.other_user.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">{currentChat.other_user.name} {currentChat.other_user.last_name}</h3>
                                  {currentChat.property && (
                                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Sobre: {currentChat.property.title}</p>
                                  )}
                              </div>
                          </div>
                      </div>

                      {/* Messages Area */}
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
                                                  className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2 ${message.reactions && Object.keys(message.reactions).length > 0 ? 'min-w-[140px] sm:min-w-[180px]' : ''} ${isOwn ? 'bg-emerald-500 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'}`}
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

                      {/* Message Input Area */}
                      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                          {showFilePreview && selectedFile && (
                              <div className="mb-3 sm:mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
                                  <div className="flex items-center space-x-2 min-w-0">
                                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                                      </svg>
                                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</span>
                                  </div>
                                  <button onClick={removeFile} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0 ml-2">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                  </button>
                              </div>
                          )}

                          {/* Error Messages */}
                          {Object.values(errors).map((error, index) => error && (
                              <div key={index} className="mb-3 sm:mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg">
                                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                              </div>
                          ))}

                          <form onSubmit={sendMessage} className="flex items-end space-x-2">
                              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,audio/*,.webm,.mp4" />

                              {/* Action Buttons */}
                              <div className="flex space-x-1 flex-shrink-0">
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200">
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                      </svg>
                                  </button>
                                  <button type="button" onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`p-2 transition-colors duration-200 ${isRecording ? 'text-red-500 hover:text-red-600' : 'text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400'}`}>
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {isRecording ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />}
                                      </svg>
                                  </button>
                                  <button type="button" onClick={shareLocation} disabled={isGettingLocation} className="p-2 text-gray-500 hover:text-emerald-500 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200 disabled:opacity-50">
                                      {isGettingLocation ? (
                                          <div className="w-5 h-5 sm:w-6 sm:h-6 animate-spin">
                                              <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                              </svg>
                                          </div>
                                      ) : (
                                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                      )}
                                  </button>
                              </div>

                              {/* Message Input */}
                              <div className="flex-1 min-w-0">
                                  <textarea
                                      ref={messageInputRef}
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      placeholder="Escribe un mensaje..."
                                      rows="1"
                                      className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                                      onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              sendMessage(e);
                                          }
                                      }}
                                  />
                              </div>

                              {/* Send Button */}
                              <button
                                  type="submit"
                                  disabled={(!newMessage.trim() && !selectedFile) || isSending}
                                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex-shrink-0"
                              >
                                  {isSending ? (
                                      <div className="w-5 h-5 sm:w-6 sm:h-6 animate-spin">
                                          <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                          </svg>
                                      </div>
                                  ) : (
                                      <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>
  );
}

export default Chat;
