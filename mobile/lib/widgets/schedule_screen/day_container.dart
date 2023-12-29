import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';

class DayContainer extends StatelessWidget {
  final String currentDay;
  final bool isActive;
  final Function callback;
  const DayContainer(
      {super.key,
      required this.currentDay,
      required this.isActive,
      required this.callback});

  @override
  Widget build(BuildContext context) {
    return SplashOnPressed(
      onPressed: callback,
      splashColor: Colors.grey,
      radius: 4,
      child: Container(
        width: 52,
        decoration: BoxDecoration(
            border: Border.all(
              color: isActive
                  ? Themes.kYellow
                  : const Color.fromRGBO(133, 133, 133, 1),
            ),
            borderRadius: const BorderRadius.all(
              Radius.circular(4),
            ),
            color: isActive ? Themes.kYellow : Colors.transparent),
        child: Center(
          child: Text(
            currentDay,
            style: TextStyle(
                color: isActive
                    ? Colors.black
                    : const Color.fromRGBO(133, 133, 133, 1),
                fontSize: 16,
                fontWeight: FontWeight.normal),
          ),
        ),
      ),
    );
  }
}
