import 'package:coursehub/providers/navigation_provider.dart';
import 'package:provider/provider.dart';

import '../common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import '../../constants/themes.dart';

class NavBarIcon extends StatefulWidget {
  final bool isSelected;
  final String label;
  final AnimationController controller;

  const NavBarIcon({
    super.key,
    required this.controller,
    required this.isSelected,
    required this.label,
  });

  @override
  State<NavBarIcon> createState() => _NavBarIconState();
}

class _NavBarIconState extends State<NavBarIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  late Animation _sizeAnimation;

  @override
  void initState() {
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _sizeAnimation = TweenSequence([
      TweenSequenceItem<double>(tween: Tween(begin: 32, end: 30), weight: 100),
      TweenSequenceItem<double>(tween: Tween(begin: 30, end: 32), weight: 100),
    ]).animate(_controller);

    super.initState();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  IconData logo() {
    if (widget.label == 'Profile') {
      return widget.isSelected ? Icons.person : Icons.person_outline;
    } else if (widget.label == 'Favourites') {
      return widget.isSelected ? Icons.star : Icons.star_outline_sharp;
    } else if (widget.label == 'Browse') {
      return widget.isSelected ? Icons.folder : Icons.folder_outlined;
    } else {
      return widget.isSelected ? Icons.home : Icons.home_outlined;
    }
  }

  int serialNo() {
    if (widget.label == 'Profile') {
      return 4;
    } else if (widget.label == 'Favourites') {
      return 3;
    } else if (widget.label == 'Browse') {
      return 1;
    } else {
      return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return Column(
      children: [
        const Spacer(),
        SplashOnPressed(
          splashColor: const Color.fromRGBO(0, 0, 0, 0.4),
          onPressed: () {
            // _controller.reset();
            // _controller.forward();

            if (navigationProvider.currentPageNumber == 2) {
              widget.controller.reverse(from: 0.75);
            }

            navigationProvider.changePageNumber(serialNo());
          },
          child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                return Container(
                  padding: const EdgeInsets.all(4.0),
                  child: Icon(
                    logo(),
                    color: Colors.black,
                    size: _sizeAnimation.value,
                  ),
                );
              }),
        ),
        Text(
          widget.label,
          style: Themes.darkTextTheme.bodySmall,
        ),
        const SizedBox(
          height: 8.0,
        )
      ],
    );
  }
}
