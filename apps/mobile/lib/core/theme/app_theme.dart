import 'package:flutter/material.dart';

class AppColors {
  static const brandRed = Color(0xFFE10600);
  static const brandBlue = Color(0xFF2563EB);
  static const brandBlack = Color(0xFF0D0D0D);
  static const brandGray = Color(0xFF181818);
  static const navBar = Color(0xFF111111);
  static const surfaceElevated = Color(0xFF222222);
  static const white08 = Color(0x14FFFFFF);
  static const white40 = Color(0x66FFFFFF);
}

class AppTheme {
  static const radius = 18.0;

  static ThemeData get dark {
    final base = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      fontFamily: 'Inter',
      colorScheme: const ColorScheme.dark(
        primary: AppColors.brandRed,
        secondary: AppColors.brandBlue,
        surface: AppColors.brandGray,
        onPrimary: Colors.white,
        onSurface: Colors.white,
      ),
    );
    return base.copyWith(
      scaffoldBackgroundColor: AppColors.brandBlack,
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.brandBlack,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
      ),
      cardTheme: CardThemeData(
        color: AppColors.brandGray,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
      ),
      dividerColor: AppColors.white08,
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceElevated,
        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.35)),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radius),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.brandRed,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
        ),
      ),
    );
  }
}
