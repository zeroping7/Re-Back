package com.zeroping7.reback;

import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.WindowManager;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Pantalla siempre encendida mientras se juega
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    // Mando (CTL-05): los botones van al juego (Gamepad API) y el B no cierra la app
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int src = event.getSource();
        boolean fromPad = (src & InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD
                || (src & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK;
        int code = event.getKeyCode();
        if (fromPad && (KeyEvent.isGamepadButton(code) || code == KeyEvent.KEYCODE_BACK)) {
            if (code != KeyEvent.KEYCODE_BACK && getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().dispatchKeyEvent(event);
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    // Pantalla completa inmersiva
    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
