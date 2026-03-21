# Vercel Serverless Function Entry Point
# This is a simplified version for Vercel deployment

from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from mangum import Mangum
from pydantic import BaseModel

app = FastAPI()


class CartAddRequest(BaseModel):
    product_id: str
    product_name: str
    category: str
    product_type: str
    shade_name: Optional[str] = None
    shade_hex: Optional[str] = None
    cartridge_id: Optional[str] = None
    cartridge_percentage: Optional[float] = None
    finish: Optional[str] = None
    experience_type: Optional[str] = None
    launch_mode: Optional[str] = None
    quantity: int = 1
    price: float = 0

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


async def _cart_add_response(req: CartAddRequest):
    return {
        "success": True,
        "message": f"{req.product_name} added to cart",
        "product_id": req.product_id,
        "category": req.category,
        "product_type": req.product_type,
        "quantity": req.quantity,
        "price": req.price,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@app.post("/cart/add")
async def cart_add(req: CartAddRequest):
    return await _cart_add_response(req)


@app.post("/api/cart/add")
async def cart_add_with_prefix(req: CartAddRequest):
    return await _cart_add_response(req)

# Wrap FastAPI app with Mangum for AWS Lambda/Vercel compatibility
handler = Mangum(app)
