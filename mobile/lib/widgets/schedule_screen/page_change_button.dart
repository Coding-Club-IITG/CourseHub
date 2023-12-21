import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

class PageChangeButton extends StatelessWidget {
  final String logoImage;
  final bool isActive;
  final Function callBack;
  const PageChangeButton(
      {super.key,
      required this.logoImage,
      required this.isActive,
      required this.callBack});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: 18,
      backgroundColor: const Color.fromRGBO(37, 37, 37, 1),
      child: SplashOnPressed(
        onPressed: callBack,
        splashColor: Colors.grey,
        radius: 16,
        child: CircleAvatar(
          radius: 16,
          backgroundColor: Colors.transparent,
          child: SvgPicture.asset(
            logoImage,
            width: 15,
            height: 15,
            colorFilter: ColorFilter.mode(
                isActive
                    ? Themes.kYellow
                    : const Color.fromRGBO(165, 165, 165, 1),
                BlendMode.srcIn),
          ),
        ),
      ),
    );
  }
}
