// Registro y actualización automática del Service Worker
if ('serviceWorker' in navigator) {
    // Limpiar registros antiguos antes de registrar uno nuevo
    navigator.serviceWorker.getRegistrations().then(registrations => {
        const oldRegistrations = registrations.filter(reg => 
            !reg.active || reg.active.scriptURL.indexOf('sw.js') === -1
        );
        
        oldRegistrations.forEach(reg => {
            console.log('🧹 Limpiando registro antiguo');
            reg.unregister();
        });
    }).finally(() => {
        // Registrar el service worker
        navigator.serviceWorker.register('sw.js', { scope: '/' }).then(registration => {
            console.log('✅ Service Worker registrado correctamente');
            
            // Verificar actualizaciones cada 60 segundos
            setInterval(() => {
                registration.update();
            }, 60000);
            
            // Detectar nueva versión instalada
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('🔄 Nueva versión disponible');
                    }
                });
            });
        }).catch(error => {
            console.warn('❌ Error al registrar Service Worker:', error);
            console.warn('💡 Intenta ir a: reset-sw.html para limpiar');
        });
    });
        
        // Detectar nueva versión instalada
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                    console.log('🔄 Nueva versión disponible');
                }
            });
        });
    }).catch(error => {
        console.warn('❌ Error al registrar Service Worker:', error);
    });
    
    // Escuchar mensajes del Service Worker para recargar automáticamente
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'RELOAD') {
            console.log('🔄 Actualizando a nueva versión...');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }
    });
}
