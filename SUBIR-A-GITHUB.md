# Subir SilentEye a GitHub

El commit ya está creado. Sigue estos pasos:

## 1. Crear el repositorio en GitHub

1. Entra a **https://github.com/new**
2. **Repository name:** `SilentEye` (o el que prefieras)
3. **Description:** App de seguimiento vehicular con dispositivos Teltonika
4. Selecciona **Public**
5. **NO marques** "Add a README" (ya tienes uno)
6. Clic en **Create repository**

## 2. Conectar y subir

En PowerShell, desde la carpeta del proyecto:

```powershell
cd e:\SilentEye

# Agregar el remote (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/SilentEye.git

# Subir al repositorio
git push -u origin main
```

Si tu rama se llama `master` en vez de `main`:
```powershell
git push -u origin main
```
(o `git branch -M main` si necesitas renombrar)

## 3. Autenticación

Cuando hagas `git push`, GitHub te pedirá credenciales:
- **Usuario:** tu usuario de GitHub
- **Contraseña:** usa un **Personal Access Token** (no tu contraseña normal)
  - GitHub → Settings → Developer settings → Personal access tokens
  - Genera uno con permiso `repo`

---

## Alternativa: usar SSH

Si ya tienes SSH configurado con GitHub:

```powershell
git remote add origin git@github.com:TU_USUARIO/SilentEye.git
git push -u origin main
```
