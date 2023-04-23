import 'package:flutter/material.dart';

import '../../constants/themes.dart';

class CustomButton extends StatelessWidget {
  final String title;

  final Function onPressed;
  const CustomButton({super.key, required this.title, required this.onPressed});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Themes.kYellow,
      child: InkWell(
        splashColor: const Color.fromRGBO(0, 0, 0, 0.1),
        onTap: () async {
          await onPressed();
        },
        child: Container(
          height: 45,
          decoration: BoxDecoration(
            color: Colors.transparent,
            border: Border.all(color: Colors.black, width: 0.5),
          
          ),
          child: Center(
            child: Text(
              title,
              style: Themes.darkTextTheme.bodyLarge,
            ),
          ),
        ),
      ),
    );
  }
}
