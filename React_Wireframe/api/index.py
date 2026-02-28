# Vercel Serverless Function Entry Point
# This is a simplified version for Vercel deployment

from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()

@app.get("/")
async def root():
    return {
        "message": "SkinSignature API",
        "version": "1.0",
        "status": "running",
        "note": "Full features available on dedicated backend server"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "platform": "Vercel Serverless"
    }

# Wrap FastAPI app with Mangum for AWS Lambda/Vercel compatibility
handler = Mangum(app)
