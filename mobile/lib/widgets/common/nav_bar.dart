import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import 'package:provider/provider.dart';

import '../../constants/themes.dart';

class NavBar extends StatelessWidget {
  const NavBar({super.key});

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
      color: Colors.black,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          SplashOnPressed(
            splashColor: Colors.grey,
            onPressed: () {
              navigationProvider.key.currentState!.openDrawer();
            },
            child: const SizedBox(
              height: 32,
              width: 32,
              child: Icon(
                Icons.menu_rounded,
                color: Colors.white,
              ),
            ),
          ),
          const Spacer(),
          const Text(
            'CourseHub',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700),
          ),
          const SizedBox(
            width: 2,
          ),
          Visibility(
            visible: navigationProvider.currentPageNumber == 7,
            child: const Text(
              'Team',
              style: TextStyle(fontSize: 14, color: Themes.kYellow),
            ),
          ),
          const Spacer(),
          SplashOnPressed(
            splashColor: Colors.grey,
            onPressed: () {
              navigationProvider.changePageNumber(5);
            },
            child: SizedBox(
              height: 32,
              width: 32,
              child: SvgPicture.asset(
                'assets/search.svg',
                width: 24,
                height: 24,
                fit: BoxFit.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
