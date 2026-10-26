
export async function onRequestGet() {
    // Temporary test: confirm the backend route is deployed.
    // This endpoint does not call OpenRouter or use an API key.
    return Response.json({
        success: true,
        message: "World of Puffballs backend is alive!"
    });
}
