import React, { useState, useEffect } from 'react';
import PropertyMap from './PropertyMap';

function Welcome({ user = null }) {
   // Scroll effects
   useEffect(() => {
       const handleScroll = () => {
           const backToTop = document.getElementById('back-to-top');
           const scrolled = window.pageYOffset;

           if (backToTop) {
               if (scrolled > 300) {
                   backToTop.style.opacity = '1';
                   backToTop.style.visibility = 'visible';
               } else {
                   backToTop.style.opacity = '0';
                   backToTop.style.visibility = 'hidden';
               }
           }
       };

       window.addEventListener('scroll', handleScroll);
       return () => window.removeEventListener('scroll', handleScroll);
   }, []);

   const scrollToTop = () => {
       window.scrollTo({
           top: 0,
           behavior: 'smooth'
       });
   };

   return (
       <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
           {/* Hero Section */}
           <section className="hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 1rem' }}>
               <div className="floating-elements">
                   <i className="floating-icon fas fa-home"></i>
                   <i className="floating-icon fas fa-key"></i>
                   <i className="floating-icon fas fa-building"></i>
                   <i className="floating-icon fas fa-heart"></i>
               </div>

               <div className="hero-content" style={{ position: 'relative', zIndex: 20, maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
                   <h1 className="hero-title font-display" style={{
                       fontSize: 'clamp(2rem, 6vw, 4rem)',
                       lineHeight: '1.2',
                       marginBottom: '1.5rem'
                   }}>
                       Encuentra tu <span style={{background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Hogar Ideal</span>
                   </h1>
                   <p className="hero-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       maxWidth: '600px',
                       margin: '0 auto 2rem',
                       lineHeight: '1.6'
                   }}>
                       La mejor selección de propiedades en renta con tecnología de vanguardia y servicio personalizado
                   </p>

                   {/* Search Bar */}
                   <div className="search-container glass" style={{
                       maxWidth: '800px',
                       margin: '0 auto',
                       padding: '1.5rem',
                       borderRadius: '1rem'
                   }}>
                       <form className="search-form" action="/search" method="POST" style={{
                           display: 'grid',
                           gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                           gap: '1rem',
                           alignItems: 'end'
                       }}>
                           <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                           <input type="text" name="location" placeholder="¿Dónde quieres vivir?" className="search-input" />
                           <select name="property_type" className="search-input">
                               <option value="">Tipo de propiedad</option>
                               <option value="casa">Casa</option>
                               <option value="departamento">Departamento</option>
                               <option value="estudio">Estudio</option>
                           </select>
                           <button type="submit" className="search-btn" style={{
                               gridColumn: window.innerWidth < 768 ? '1 / -1' : 'auto'
                           }}>
                               <i className="fas fa-search" style={{ marginRight: 'var(--spacing-sm)' }}></i> Buscar
                           </button>
                       </form>
                   </div>
               </div>

               {/* Scroll Indicator */}
               <div className="scroll-indicator" style={{
                   position: 'absolute',
                   bottom: '2rem',
                   left: '50%',
                   transform: 'translateX(-50%)',
                   display: window.innerWidth < 768 ? 'none' : 'block'
               }}>
                   <div className="scroll-mouse">
                       <div className="scroll-wheel"></div>
                   </div>
               </div>
           </section>

           {/* Features Section */}
           <section className="section" style={{background: 'var(--bg-secondary)', padding: 'clamp(3rem, 8vw, 6rem) 1rem'}}>
               <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                   <h2 className="section-title font-display" style={{
                       fontSize: 'clamp(2rem, 5vw, 3rem)',
                       textAlign: 'center',
                       marginBottom: '1rem'
                   }}>
                       Por qué elegir ViveSpaces
                   </h2>
                   <p className="section-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       textAlign: 'center',
                       marginBottom: '3rem',
                       maxWidth: '600px',
                       margin: '0 auto 3rem'
                   }}>
                       Ofrecemos las mejores propiedades con los servicios más completos del mercado
                   </p>

                   <div style={{
                       display: 'grid',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                       gap: '2rem'
                   }}>
                       <div className="feature-card animate-slide-up">
                           <div className="feature-icon">
                               <i className="fas fa-home"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Amplia Selección</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Más de 1,000 propiedades disponibles en las mejores zonas de la ciudad con filtros inteligentes.</p>
                       </div>

                       <div className="feature-card animate-slide-up" style={{animationDelay: '0.2s'}}>
                           <div className="feature-icon" style={{background: 'var(--gradient-secondary)'}}>
                               <i className="fas fa-hand-holding-usd"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Precios Competitivos</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Encuentra las mejores opciones según tu presupuesto con nuestro sistema de comparación.</p>
                       </div>

                       <div className="feature-card animate-slide-up" style={{animationDelay: '0.4s'}}>
                           <div className="feature-icon" style={{background: 'var(--gradient-accent)'}}>
                               <i className="fas fa-headset"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Soporte 24/7</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Nuestro equipo está disponible para ayudarte en cualquier momento con chat en vivo.</p>
                       </div>
                   </div>
               </div>
           </section>

           {/* Map Section */}
           <section className="section" style={{background: 'var(--bg-primary)', padding: 'clamp(3rem, 8vw, 6rem) 1rem'}}>
               <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                   <h2 className="section-title font-display" style={{
                       fontSize: 'clamp(2rem, 5vw, 3rem)',
                       textAlign: 'center',
                       marginBottom: '1rem'
                   }}>
                       Ubicaciones de Propiedades
                   </h2>
                   <p className="section-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       textAlign: 'center',
                       marginBottom: '3rem',
                       maxWidth: '600px',
                       margin: '0 auto 3rem'
                   }}>
                       Explora nuestras propiedades disponibles en el mapa interactivo
                   </p>

                   <div style={{
                       position: 'relative',
                       height: 'clamp(300px, 50vw, 500px)',
                       borderRadius: '1rem',
                       overflow: 'hidden',
                       boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                       border: '1px solid var(--border-primary)'
                   }}>
                       <PropertyMap />
                   </div>
               </div>
           </section>

           {/* Property Showcase */}
           <section className="section" style={{background: 'var(--bg-secondary)', padding: 'clamp(3rem, 8vw, 6rem) 1rem'}}>
               <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                   <h2 className="section-title font-display" style={{
                       fontSize: 'clamp(2rem, 5vw, 3rem)',
                       textAlign: 'center',
                       marginBottom: '1rem'
                   }}>
                       Propiedades Destacadas
                   </h2>
                   <p className="section-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       textAlign: 'center',
                       marginBottom: '3rem',
                       maxWidth: '600px',
                       margin: '0 auto 3rem'
                   }}>
                       Explora nuestras mejores opciones disponibles con tours virtuales 360°
                   </p>

                   <div className="properties-grid" style={{
                       display: 'grid',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                       gap: '2rem',
                       marginBottom: '3rem'
                   }}>
                       {/* Property 1 */}
                       <div className="property-card animate-fade-scale">
                           <div className="property-image">
                               <img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop" alt="Casa Moderna" style={{width: '100%', height: '200px', objectFit: 'cover'}} />
                               <div className="property-badge">Destacado</div>
                           </div>
                           <div className="property-content">
                               <div className="property-title">Departamento Loft</div>
                               <div className="property-location">
                                   <i className="fas fa-map-marker-alt"></i>
                                   <span>Roma Norte, CDMX</span>
                               </div>
                               <div className="property-details">
                                   <div className="detail-item">
                                       <div className="detail-label">Habitaciones</div>
                                       <div className="detail-value">2</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">Baños</div>
                                       <div className="detail-value">2</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">m²</div>
                                       <div className="detail-value">85</div>
                                   </div>
                               </div>
                               <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}}>Loft moderno con techos altos y terraza privada.</p>
                               <div className="property-price">$18,000</div>
                               <div className="property-actions">
                                   <button className="btn btn-primary">Ver detalles</button>
                               </div>
                           </div>
                       </div>

                       {/* Property 2 */}
                       <div className="property-card animate-fade-scale" style={{animationDelay: '0.2s'}}>
                           <div className="property-image">
                               <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop" alt="Casa Familiar" style={{width: '100%', height: '200px', objectFit: 'cover'}} />
                               <div className="property-badge" style={{background: 'var(--accent)'}}>Nuevo</div>
                           </div>
                           <div className="property-content">
                               <div className="property-title">Casa Familiar</div>
                               <div className="property-location">
                                   <i className="fas fa-map-marker-alt"></i>
                                   <span>Polanco, CDMX</span>
                               </div>
                               <div className="property-details">
                                   <div className="detail-item">
                                       <div className="detail-label">Habitaciones</div>
                                       <div className="detail-value">3</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">Baños</div>
                                       <div className="detail-value">2.5</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">m²</div>
                                       <div className="detail-value">150</div>
                                   </div>
                               </div>
                               <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}}>Casa espaciosa con jardín y garage para 2 autos.</p>
                               <div className="property-price">$28,000</div>
                               <div className="property-actions">
                                   <button className="btn btn-primary">Ver detalles</button>
                               </div>
                           </div>
                       </div>

                       {/* Property 3 */}
                       <div className="property-card animate-fade-scale" style={{animationDelay: '0.4s'}}>
                           <div className="property-image">
                               <img src="https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400&h=300&fit=crop" alt="Penthouse" style={{width: '100%', height: '200px', objectFit: 'cover'}} />
                               <div className="property-badge" style={{background: 'var(--gradient-purple)'}}>Premium</div>
                           </div>
                           <div className="property-content">
                               <div className="property-title">Penthouse Elite</div>
                               <div className="property-location">
                                   <i className="fas fa-map-marker-alt"></i>
                                   <span>Santa Fe, CDMX</span>
                               </div>
                               <div className="property-details">
                                   <div className="detail-item">
                                       <div className="detail-label">Habitaciones</div>
                                       <div className="detail-value">4</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">Baños</div>
                                       <div className="detail-value">3</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">m²</div>
                                       <div className="detail-value">200</div>
                                   </div>
                               </div>
                               <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}}>Penthouse exclusivo con vista panorámica de la ciudad.</p>
                               <div className="property-price">$45,000</div>
                               <div className="property-actions">
                                   <button className="btn btn-primary">Ver detalles</button>
                               </div>
                           </div>
                       </div>

                       {/* Property 4 */}
                       <div className="property-card animate-fade-scale" style={{animationDelay: '0.6s'}}>
                           <div className="property-image">
                               <img src="https://images.unsplash.com/photo-1560185893-1d49ec14df41?w=400&h=300&fit=crop" alt="Estudio Minimalista" style={{width: '100%', height: '200px', objectFit: 'cover'}} />
                               <div className="property-badge" style={{background: 'var(--accent)'}}>Oferta</div>
                           </div>
                           <div className="property-content">
                               <div className="property-title">Estudio Minimalista</div>
                               <div className="property-location">
                                   <i className="fas fa-map-marker-alt"></i>
                                   <span>Condesa, CDMX</span>
                               </div>
                               <div className="property-details">
                                   <div className="detail-item">
                                       <div className="detail-label">Habitaciones</div>
                                       <div className="detail-value">1</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">Baños</div>
                                       <div className="detail-value">1</div>
                                   </div>
                                   <div className="detail-item">
                                       <div className="detail-label">m²</div>
                                       <div className="detail-value">45</div>
                                   </div>
                               </div>
                               <p style={{color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'}}>Estudio perfecto para jóvenes profesionales.</p>
                               <div className="property-price">$12,000</div>
                               <div className="property-actions">
                                   <button className="btn btn-primary">Ver detalles</button>
                               </div>
                           </div>
                       </div>
                   </div>

                   <div style={{textAlign: 'center'}}>
                       <a href="/properties" className="btn btn-primary" style={{
                           fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                           padding: 'clamp(0.8rem, 2vw, 1.2rem) clamp(2rem, 5vw, 3rem)',
                           textDecoration: 'none',
                           display: 'inline-block'
                       }}>
                           Ver todas las propiedades <i className="fas fa-arrow-right" style={{marginLeft: 'var(--spacing-sm)'}}></i>
                       </a>
                   </div>
               </div>
           </section>

           {/* Services Section */}
           <section className="section" style={{background: 'var(--bg-primary)', padding: 'clamp(3rem, 8vw, 6rem) 1rem'}}>
               <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                   <h2 className="section-title font-display" style={{
                       fontSize: 'clamp(2rem, 5vw, 3rem)',
                       textAlign: 'center',
                       marginBottom: '1rem'
                   }}>
                       Servicios Adicionales
                   </h2>
                   <p className="section-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       textAlign: 'center',
                       marginBottom: '3rem',
                       maxWidth: '600px',
                       margin: '0 auto 3rem'
                   }}>
                       Todo lo que necesitas para una experiencia completa de renta
                   </p>

                   <div style={{
                       display: 'grid',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                       gap: '2rem'
                   }}>
                       <div className="feature-card animate-slide-up">
                           <div className="feature-icon" style={{background: 'var(--gradient-primary)'}}>
                               <i className="fas fa-camera"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Tours Virtuales 360°</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Explora cada propiedad desde la comodidad de tu hogar con nuestra tecnología de realidad virtual.</p>
                       </div>

                       <div className="feature-card animate-slide-up" style={{animationDelay: '0.2s'}}>
                           <div className="feature-icon" style={{background: 'var(--gradient-purple)'}}>
                               <i className="fas fa-file-contract"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Contratos Digitales</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Firma tu contrato de manera segura y rápida con nuestra plataforma de documentos digitales.</p>
                       </div>

                       <div className="feature-card animate-slide-up" style={{animationDelay: '0.4s'}}>
                           <div className="feature-icon" style={{background: 'var(--gradient-orange)'}}>
                               <i className="fas fa-tools"></i>
                           </div>
                           <h3 className="text-xl font-bold mb-3 font-display" style={{color: 'var(--text-primary)'}}>Mantenimiento Incluido</h3>
                           <p style={{color: 'var(--text-secondary)'}}>Servicio de mantenimiento y reparaciones menores incluido en todas nuestras propiedades.</p>
                       </div>
                   </div>
               </div>
           </section>

           {/* Testimonials */}
           <section className="section" style={{background: 'var(--bg-secondary)', padding: 'clamp(3rem, 8vw, 6rem) 1rem'}}>
               <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                   <h2 className="section-title font-display" style={{
                       fontSize: 'clamp(2rem, 5vw, 3rem)',
                       textAlign: 'center',
                       marginBottom: '1rem'
                   }}>
                       Lo que dicen nuestros clientes
                   </h2>
                   <p className="section-subtitle" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       textAlign: 'center',
                       marginBottom: '3rem',
                       maxWidth: '600px',
                       margin: '0 auto 3rem'
                   }}>
                       Miles de personas han encontrado su hogar ideal con nosotros
                   </p>

                   <div style={{
                       display: 'grid',
                       gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                       gap: '2rem'
                   }}>
                       <div className="feature-card animate-fade-scale" style={{
                           background: 'var(--bg-tertiary)',
                           border: '1px solid var(--border-primary)',
                           color: 'var(--text-primary)'
                       }}>
                           <div style={{display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '1rem'}}>
                               <img src="https://images.unsplash.com/photo-1494790108755-2616b164c970?w=60&h=60&fit=crop&crop=face"
                                   alt="Cliente" style={{width: '3rem', height: '3rem', borderRadius: 'var(--radius-full)', flexShrink: 0}} />
                               <div>
                                   <h4 style={{fontWeight: 'bold', color: 'var(--text-primary)', margin: 0}}>María González</h4>
                                   <div style={{color: 'var(--warning)'}}>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                   </div>
                               </div>
                           </div>
                           <p style={{color: 'var(--text-secondary)', margin: 0}}>"Excelente servicio, encontré mi departamento ideal en menos de una semana. El proceso fue muy fácil y transparente."</p>
                       </div>

                       <div className="feature-card animate-fade-scale" style={{
                           background: 'var(--bg-tertiary)',
                           border: '1px solid var(--border-primary)',
                           color: 'var(--text-primary)',
                           animationDelay: '0.2s'
                       }}>
                           <div style={{display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '1rem'}}>
                               <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face"
                                   alt="Cliente" style={{width: '3rem', height: '3rem', borderRadius: 'var(--radius-full)', flexShrink: 0}} />
                               <div>
                                   <h4 style={{fontWeight: 'bold', color: 'var(--text-primary)', margin: 0}}>Carlos Ruiz</h4>
                                   <div style={{color: 'var(--warning)'}}>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                   </div>
                               </div>
                           </div>
                           <p style={{color: 'var(--text-secondary)', margin: 0}}>"Los tours virtuales me ahorraron mucho tiempo. Pude ver varias propiedades sin salir de casa y elegir la perfecta."</p>
                       </div>

                       <div className="feature-card animate-fade-scale" style={{
                           background: 'var(--bg-tertiary)',
                           border: '1px solid var(--border-primary)',
                           color: 'var(--text-primary)',
                           animationDelay: '0.4s'
                       }}>
                           <div style={{display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap', gap: '1rem'}}>
                               <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face"
                                   alt="Cliente" style={{width: '3rem', height: '3rem', borderRadius: 'var(--radius-full)', flexShrink: 0}} />
                               <div>
                                   <h4 style={{fontWeight: 'bold', color: 'var(--text-primary)', margin: 0}}>Ana Martínez</h4>
                                   <div style={{color: 'var(--warning)'}}>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                       <i className="fas fa-star"></i>
                                   </div>
                               </div>
                           </div>
                           <p style={{color: 'var(--text-secondary)', margin: 0}}>"El soporte 24/7 es increíble. Siempre responden rápido y resuelven cualquier duda que tengo sobre mi renta."</p>
                       </div>
                   </div>
               </div>
           </section>

           {/* Call to Action */}
           <section className="section" style={{
               background: 'var(--bg-tertiary)',
               position: 'relative',
               overflow: 'hidden',
               color: 'var(--text-primary)',
               padding: 'clamp(3rem, 8vw, 6rem) 1rem'
           }}>
               <div className="container" style={{textAlign: 'center', position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto'}}>
                   <h2 className="font-display animate-slide-up" style={{
                       fontSize: 'clamp(2rem, 6vw, 3rem)',
                       fontWeight: 800,
                       marginBottom: '1.5rem',
                       color: 'var(--text-primary)'
                   }}>
                       ¿Listo para encontrar tu hogar ideal?
                   </h2>
                   <p className="animate-slide-up" style={{
                       fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
                       color: 'var(--text-secondary)',
                       marginBottom: '2rem',
                       maxWidth: '32rem',
                       marginLeft: 'auto',
                       marginRight: 'auto',
                       animationDelay: '0.2s'
                   }}>
                       Únete a miles de personas que ya encontraron su lugar perfecto con ViveSpaces
                   </p>
                   <div className="animate-slide-up" style={{
                            animationDelay: '0.4s',
                            display: 'flex',
                            flexDirection: window.innerWidth < 640 ? 'column' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1.5rem',
                            flexWrap: 'wrap'
                        }}>
                            <a href="/register" className="btn btn-primary" style={{
                                fontSize: 'clamp(1rem, 2.5vw, 1.1rem)',
                                padding: 'clamp(0.8rem, 2vw, 1.2rem) clamp(2rem, 5vw, 2.5rem)',
                                textDecoration: 'none',
                                minWidth: '200px'
                            }}>
                                Comenzar ahora <i className="fas fa-rocket" style={{marginLeft: 'var(--spacing-sm)'}}></i>
                            </a>
                            <a href="/properties" className="btn btn-secondary" style={{
                                fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
                                textDecoration: 'none',
                                padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1.5rem, 4vw, 2rem)',
                                minWidth: '200px'
                            }}>
                                Ver propiedades <i className="fas fa-search" style={{marginLeft: 'var(--spacing-sm)'}}></i>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="footer" style={{ padding: 'clamp(3rem, 8vw, 4rem) 1rem 2rem' }}>
                    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div className="footer-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '2rem 3rem',
                            marginBottom: '3rem'
                        }}>
                            {/* Logo and Info */}
                            <div style={{ gridColumn: window.innerWidth < 768 ? '1 / -1' : 'span 2' }}>
                                <a href="/" style={{
                                    color: 'var(--text-primary)',
                                    fontFamily: "'Poppins', sans-serif",
                                    fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '1.5rem',
                                    textDecoration: 'none'
                                }}>
                                    <i className="fas fa-home" style={{marginRight: 'var(--spacing-sm)', color: 'var(--primary)'}}></i> ViveSpaces
                                </a>
                                <p style={{
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '1.5rem',
                                    lineHeight: 1.6,
                                    maxWidth: '400px'
                                }}>
                                    Encuentra tu hogar ideal con nosotros. La mejor selección de propiedades en renta con tecnología de vanguardia.
                                </p>
                                <div className="social-links" style={{
                                    display: 'flex',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <a href="#" className="social-link">
                                        <i className="fab fa-facebook-f"></i>
                                    </a>
                                    <a href="#" className="social-link">
                                        <i className="fab fa-twitter"></i>
                                    </a>
                                    <a href="#" className="social-link">
                                        <i className="fab fa-instagram"></i>
                                    </a>
                                    <a href="#" className="social-link">
                                        <i className="fab fa-linkedin-in"></i>
                                    </a>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h3 style={{
                                    fontSize: 'clamp(1rem, 2.5vw, var(--font-size-lg))',
                                    fontWeight: 'bold',
                                    marginBottom: '1.5rem',
                                    fontFamily: "'Poppins', sans-serif",
                                    color: 'var(--text-primary)'
                                }}>
                                    Enlaces rápidos
                                </h3>
                                <ul style={{listStyle: 'none', padding: 0}}>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Inicio</a>
                                    </li>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/properties" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Propiedades</a>
                                    </li>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/services" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Servicios</a>
                                    </li>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/about" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Sobre nosotros</a>
                                    </li>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/contact" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Contacto</a>
                                    </li>
                                    <li style={{marginBottom: 'var(--spacing-sm)'}}>
                                        <a href="/blog" style={{color: 'var(--text-tertiary)', textDecoration: 'none', transition: 'color 0.3s'}}>Blog</a>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h3 style={{
                                    fontSize: 'clamp(1rem, 2.5vw, var(--font-size-lg))',
                                    fontWeight: 'bold',
                                    marginBottom: '1.5rem',
                                    fontFamily: "'Poppins', sans-serif",
                                    color: 'var(--text-primary)'
                                }}>
                                    Contacto
                                </h3>
                                <ul style={{listStyle: 'none', padding: 0, color: 'var(--text-tertiary)'}}>
                                    <li style={{display: 'flex', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)'}}>
                                        <i className="fas fa-envelope" style={{marginTop: '0.25rem', marginRight: '0.75rem', color: 'var(--primary)', flexShrink: 0}}></i>
                                        <span>hola@vivespaces.com</span>
                                    </li>
                                    <li style={{display: 'flex', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)'}}>
                                        <i className="fas fa-clock" style={{marginTop: '0.25rem', marginRight: '0.75rem', color: 'var(--primary)', flexShrink: 0}}></i>
                                        <span>Lun - Vie: 9:00 - 18:00<br />Sáb: 10:00 - 16:00</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Newsletter */}
                            <div>
                                <h3 style={{
                                    fontSize: 'clamp(1rem, 2.5vw, var(--font-size-lg))',
                                    fontWeight: 'bold',
                                    marginBottom: '1.5rem',
                                    fontFamily: "'Poppins', sans-serif",
                                    color: 'var(--text-primary)'
                                }}>
                                    Newsletter
                                </h3>
                                <p style={{
                                    color: 'var(--text-tertiary)',
                                    marginBottom: '1.5rem'
                                }}>
                                    Suscríbete para recibir las mejores propiedades y ofertas exclusivas.
                                </p>
                                <form style={{display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)'}} action="/newsletter" method="POST">
                                    <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')} />
                                    <input
                                        type="email"
                                        name="email"
                                        placeholder="Tu email"
                                        className="form-input"
                                        style={{
                                            width: '100%',
                                            background: 'var(--bg-tertiary)',
                                            border: '1px solid var(--border-primary)',
                                            color: 'var(--text-primary)',
                                            padding: '0.75rem',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <button type="submit" className="btn btn-primary" style={{
                                        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                                        padding: 'clamp(0.6rem, 1.5vw, 0.75rem) clamp(1rem, 3vw, 1.5rem)'
                                    }}>
                                        Suscribirse <i className="fas fa-paper-plane" style={{marginLeft: 'var(--spacing-sm)'}}></i>
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="footer-bottom" style={{
                            borderTop: '1px solid var(--border-primary)',
                            paddingTop: '2rem',
                            display: 'flex',
                            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem',
                            textAlign: window.innerWidth < 768 ? 'center' : 'left'
                        }}>
                            <p style={{fontSize: 'clamp(0.875rem, 2vw, var(--font-size-sm))', color: 'var(--text-tertiary)', margin: 0}}>
                                © 2024 ViveSpaces. Todos los derechos reservados.
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '1.5rem',
                                flexWrap: 'wrap',
                                justifyContent: window.innerWidth < 768 ? 'center' : 'flex-end'
                            }}>
                                <a href="/terms" style={{
                                    fontSize: 'clamp(0.875rem, 2vw, var(--font-size-sm))',
                                    color: 'var(--text-tertiary)',
                                    textDecoration: 'none',
                                    transition: 'color 0.3s'
                                }}>
                                    Términos y condiciones
                                </a>
                                <a href="/privacy" style={{
                                    fontSize: 'clamp(0.875rem, 2vw, var(--font-size-sm))',
                                    color: 'var(--text-tertiary)',
                                    textDecoration: 'none',
                                    transition: 'color 0.3s'
                                }}>
                                    Política de privacidad
                                </a>
                                <a href="/privacy-notice" style={{
                                    fontSize: 'clamp(0.875rem, 2vw, var(--font-size-sm))',
                                    color: 'var(--text-tertiary)',
                                    textDecoration: 'none',
                                    transition: 'color 0.3s'
                                }}>
                                    Aviso de privacidad
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>

                {/* Back to Top Button */}
                <button id="back-to-top" onClick={scrollToTop} style={{
                    position: 'fixed',
                    bottom: 'clamp(1rem, 3vw, 1.5rem)',
                    right: 'clamp(1rem, 3vw, 1.5rem)',
                    width: 'clamp(3rem, 6vw, 3.5rem)',
                    height: 'clamp(3rem, 6vw, 3.5rem)',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    transition: 'all 0.3s ease',
                    zIndex: 1000,
                    opacity: 0,
                    visibility: 'hidden'
                }}>
                    <i className="fas fa-arrow-up"></i>
                </button>
            </div>
        );
     }

     export default Welcome;
