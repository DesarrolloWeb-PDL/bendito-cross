// Registro y actualización automática del Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(registration => {
        console.log('✅ Service Worker registrado correctamente');
        
        // Verificar actualizaciones cada 30 segundos
        setInterval(() => {
            registration.update();
        }, 30000);
        
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
