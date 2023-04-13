import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

import '../../apis/authentication/login.dart';
import '../../constants/themes.dart';

class NavBar extends StatelessWidget {
  final Function(int a) searchCallback;
  const NavBar({super.key, required this.searchCallback});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
      color: Colors.black,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () {
              Scaffold.of(context).openDrawer();
            },
            child: const Icon(
              Icons.menu_rounded,
              color: Colors.white,
            ),
          ),
          const SizedBox(
            width: 20,
          ),
          Expanded(
            flex: 10,
            child: Text(
              'CourseHub',
              style: Themes.theme.textTheme.displayMedium,
            ),
          ),
          const SizedBox(
            width: 20,
          ),
          Expanded(
            flex: 1,
            child: GestureDetector(
              onTap: () {
                searchCallback(5);
              },
              child: SvgPicture.asset(
                'assets/search.svg',
                colorFilter:
                    const ColorFilter.mode(Colors.white, BlendMode.srcIn),
              ),
            ),
          ),
          const SizedBox(
            width: 30,
          ),
          GestureDetector(
              onTap: () => logoutHandler(context),
              child: const Icon(
                Icons.logout,
                color: Colors.white,
              ))
        ],
      ),
    );
  }
}
