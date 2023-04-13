import 'package:flutter/material.dart';

class SplashOnPressed extends StatelessWidget {
  final Function onPressed;
  final Widget child;
  final Color splashColor;
  const SplashOnPressed({
    super.key,
    required this.onPressed,
    required this.child,
    required this.splashColor
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => onPressed(),
        splashColor: splashColor,
        customBorder: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        child: child,
      ),
    );
  }
}
