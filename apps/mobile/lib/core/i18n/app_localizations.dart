import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final localeProvider = StateProvider<Locale>((ref) => const Locale('ka'));

class AppLocalizations {
  AppLocalizations(this.locale, this._map);
  final Locale locale;
  final Map<String, dynamic> _map;

  static const supportedLocales = [Locale('en'), Locale('ka')];

  static const localizationsDelegates = [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    _AppLocalizationsDelegate(),
  ];

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  String t(String path, [String fallback = '']) {
    final parts = path.split('.');
    dynamic cur = _map;
    for (final p in parts) {
      if (cur is Map && cur.containsKey(p)) {
        cur = cur[p];
      } else {
        return fallback.isNotEmpty ? fallback : path;
      }
    }
    return cur?.toString() ?? fallback;
  }

  static Future<AppLocalizations> load(Locale locale) async {
    final code = locale.languageCode;
    final raw = await rootBundle.loadString('assets/i18n/$code.json');
    return AppLocalizations(locale, jsonDecode(raw) as Map<String, dynamic>);
  }
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => ['en', 'ka'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) => AppLocalizations.load(locale);

  @override
  bool shouldReload(covariant LocalizationsDelegate<AppLocalizations> old) => false;
}
