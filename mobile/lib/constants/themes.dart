import 'package:flutter/material.dart';

class Themes {
  static const kYellow = Color.fromRGBO(254, 207, 111, 1);
  static final theme = ThemeData(
    useMaterial3: true,
    primaryColor: kYellow,
    scaffoldBackgroundColor: Colors.white,
    fontFamily: 'ProximaNova',
    splashColor: kYellow,
    textTheme: const TextTheme(
      labelMedium: TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w800,
        fontSize: 16,
      ),
      labelSmall: TextStyle(
          fontSize: 14.0, fontWeight: FontWeight.w700, color: Colors.white),
      displayLarge: TextStyle(
          fontWeight: FontWeight.w700, color: Colors.white, fontSize: 28),
      displayMedium: TextStyle(
          fontWeight: FontWeight.w800, color: Colors.white, fontSize: 24),
      displaySmall: TextStyle(
        fontSize: 20.0,
        fontWeight: FontWeight.w400,
        color: Colors.white,
      ),
      bodySmall: TextStyle(
          fontWeight: FontWeight.w400, color: Colors.white, fontSize: 12),
      bodyMedium: TextStyle(
        fontSize: 16.0,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
      bodyLarge: TextStyle(
        fontSize: 20.0,
        fontWeight: FontWeight.w700,
        color: Colors.white,
      ),
    ),
    colorScheme: ColorScheme.fromSwatch().copyWith(secondary: Colors.black),
  );

  static const darkTextTheme = TextTheme(
    displayMedium: TextStyle(
      fontWeight: FontWeight.w700,
      color: Colors.black,
      fontSize: 18.0,
    ),
    displayLarge: TextStyle(
      fontWeight: FontWeight.w700,
      color: Colors.black,
      fontSize: 24.0,
    ),
    displaySmall: TextStyle(
      fontWeight: FontWeight.w700,
      color: Colors.black,
      fontSize: 12.0,
    ),
    bodyMedium: TextStyle(
      fontWeight: FontWeight.w400,
      color: Colors.black,
      fontSize: 14.0,
    ),
    bodySmall: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w400,
      color: Colors.black,
    ),
    labelSmall: TextStyle(
      fontWeight: FontWeight.w800,
      color: Colors.black,
      fontSize: 10.0,
    ),
    labelLarge: TextStyle(
        fontFamily: "ProximaNova",
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: Colors.black),
    labelMedium: TextStyle(
      fontWeight: FontWeight.w800,
      color: Colors.black,
      fontSize: 14.0,
    ),
    bodyLarge: TextStyle(
      fontWeight: FontWeight.w700,
      color: Colors.black,
      fontSize: 14.0,
    ),
  );
}

List<Color> colors = const [
  Color.fromRGBO(219, 206, 255, 1),
  Color.fromRGBO(219, 206, 255, 1),
  Color.fromRGBO(255, 167, 212, 1),
  Color.fromRGBO(255, 167, 212, 1),
  Color.fromRGBO(111, 143, 254, 1),
  Color.fromRGBO(111, 143, 254, 1),
  Color.fromRGBO(237, 244, 146, 1),
  Color.fromRGBO(237, 244, 146, 1),
];
