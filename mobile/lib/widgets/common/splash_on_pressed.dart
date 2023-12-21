import 'package:flutter/material.dart';

class SplashOnPressed extends StatelessWidget {
  final Function onPressed;
  final Widget child;
  final Color splashColor;
  final double radius;
  const SplashOnPressed(
      {super.key,
      required this.onPressed,
      required this.child,
      required this.splashColor,
      this.radius = 10});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onPressed(),
        splashColor: splashColor,
        customBorder: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
        ),
        child: child,
      ),
    );
  }
}
