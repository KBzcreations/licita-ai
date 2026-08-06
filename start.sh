#!/bin/bash
echo "========================================"
echo "LICITA AI - Development Server"
echo "========================================"
echo ""
echo "La web es un unico index.html estatico"
echo "(sin backend, habla directo con Supabase)."
echo ""

cd frontend
echo "Sirviendo en http://localhost:5173"
python3 -m http.server 5173
