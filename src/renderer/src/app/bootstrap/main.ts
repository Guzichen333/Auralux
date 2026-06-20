/**
 * Auralux renderer entry.
 */

async function bootstrap(): Promise<void> {
    await import('@api/api');
    await import('../../ui-next/bootstrap');

    console.log('Auralux renderer bootstrap complete');
}

bootstrap().catch((error) => {
    console.error('[bootstrap] Auralux renderer bootstrap failed', error);
});

export {};
