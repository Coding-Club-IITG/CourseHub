import 'package:flutter_svg/svg.dart';
import 'package:provider/provider.dart';
import 'package:flutter/material.dart';

import '../../providers/navigation_provider.dart';
import '../common/splash_on_pressed.dart';
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

  @override
  void initState() {
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );

    super.initState();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Widget logo() {
    if (widget.label == 'Profile') {
      return widget.isSelected
          ? SvgPicture.asset('assets/profile_selected.svg')
          : SvgPicture.asset('assets/profile.svg');
    } else if (widget.label == 'Schedule') {
      return widget.isSelected
          ? SvgPicture.asset('assets/schedule_selected.svg')
          : SvgPicture.asset(
              'assets/schedule.svg',
              colorFilter: const ColorFilter.mode(
                  Color.fromRGBO(74, 63, 37, 1), BlendMode.srcIn),
            );
    } else if (widget.label == 'Browse') {
      return widget.isSelected
          ? SvgPicture.asset('assets/browse_selected.svg')
          : SvgPicture.asset('assets/browse.svg');
    } else {
      return widget.isSelected
          ? SvgPicture.asset('assets/home_selected.svg')
          : SvgPicture.asset('assets/home.svg');
    }
  }

  int serialNo() {
    if (widget.label == 'Profile') {
      return 4;
    } else if (widget.label == 'Schedule') {
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
                  child: logo(),
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
