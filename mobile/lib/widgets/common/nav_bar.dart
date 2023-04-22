import 'dart:developer';

import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';

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
              log('DRAWER OPENING INITIALIZED');
            },
            child: const Icon(
              Icons.menu_rounded,
              color: Colors.white,
            ),
          ),
          Text(
            'CourseHub',
            style: Themes.theme.textTheme.displayMedium,
          ),
          GestureDetector(
            onTap: () {
              searchCallback(5);
            },
            child: SvgPicture.asset(
              'assets/search.svg',
              colorFilter:
                  const ColorFilter.mode(Colors.white, BlendMode.srcIn),
            ),
          ),
        ],
      ),
    );
  }
}
