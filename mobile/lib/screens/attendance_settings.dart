import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/providers/navigation_provider.dart';
import 'package:coursehub/widgets/attendance_settings_screen/day_card.dart';
import 'package:coursehub/widgets/attendance_settings_screen/slider_toggle.dart';

import 'package:coursehub/widgets/common/nav_bar.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class AttendanceSettingsScreen extends StatefulWidget {
  const AttendanceSettingsScreen({super.key});

  @override
  State<AttendanceSettingsScreen> createState() =>
      _AttendanceSettingsScreenState();
}

class _AttendanceSettingsScreenState extends State<AttendanceSettingsScreen> {
  final ScrollController _controller = ScrollController();
  double _percentNecessary = 0.75;
  final themeColor = CacheStore.attendanceColor;

  void _animateToIndex(int index) {
    _controller.animateTo(
      findOffset(index, 20, 320), // these gap and width are of daycards
      duration: const Duration(seconds: 1),
      curve: Curves.fastOutSlowIn,
    );
  }

  double findOffset(int index, double gap, double width) {
    double base = 0;

    if (index == 0) {
      return base;
    } else {
      return index * (width + gap) + base - (width + gap) / 7.5;
      // width/3 is bit left adjustment
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _animateToIndex(4); // Replace 3 with the desired index
    });
  }

  void toggleFunction(double val) {
    setState(() {
      _percentNecessary = val;
    });
  }

  @override
  Widget build(BuildContext context) {
    final navigatorProvider = context.read<NavigationProvider>();

    return PopScope(
        canPop: false,
        onPopInvoked: (_) {
          navigatorProvider.changePageNumber(0);
        },
        child: Scaffold(
          body: SafeArea(
            child: Ink(
              color: Colors.black,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const NavBar(),
                  const SizedBox(
                    height: 32,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(
                          width: 240,
                          child: Text(
                            "Technical Report Writing and Presentation",
                            style: TextStyle(
                                fontSize: 20, fontWeight: FontWeight.w700),
                          ),
                        ),
                        const SizedBox(
                          height: 20,
                        ),
                        Text(
                          "69%",
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 60,
                              color: themeColor),
                        ),
                        Stack(
                          children: [
                            LinearProgressIndicator(
                              value: 0.1,
                              minHeight: 10,
                              color: themeColor,
                              backgroundColor: Color.alphaBlend(
                                  const Color.fromRGBO(71, 71, 71, 0.8),
                                  themeColor),
                            ),
                            Align(
                              alignment: Alignment(
                                  (_percentNecessary * 2) + (-1),
                                  1), // 0.5 is 75% as -1 to 1
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(
                                    "Goal",
                                    style: TextStyle(
                                        color: themeColor,
                                        fontSize: 14,
                                        height: 0),
                                  ),
                                  const SizedBox(
                                    width: 4,
                                  ),
                                  Container(
                                    height: 40,
                                    width: 2,
                                    color: Color.alphaBlend(
                                        const Color.fromRGBO(
                                            255, 255, 255, 0.4),
                                        themeColor),
                                  )
                                ],
                              ),
                            )
                          ],
                        ),
                        Container(
                          transform: Matrix4.translationValues(
                              0, _percentNecessary < 0.4 ? -4 : -14, 0),
                          child: RichText(
                            text: TextSpan(
                              style: TextStyle(color: themeColor, fontSize: 14),
                              children: const [
                                TextSpan(
                                  text: "2 ",
                                  style: TextStyle(fontWeight: FontWeight.w700),
                                ),
                                TextSpan(text: "classes to attend"),
                              ],
                            ),
                          ),
                        )
                      ],
                    ),
                  ),
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 20),
                    height: 140,
                    child: ListView.separated(
                      controller: _controller,
                      separatorBuilder: (context, index) => const SizedBox(
                        width: 20,
                      ),
                      scrollDirection: Axis.horizontal,
                      itemCount: 50,
                      itemBuilder: (context, index) => DayCard(
                        themeColor: themeColor,
                        weekName: index,
                      ),
                    ),
                  ),
                  Expanded(
                    child: SliderToggle(
                        themeColor: themeColor, toggleFunction: toggleFunction),
                  ),
                ],
              ),
            ),
          ),
        ));
  }
}
