import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class DayCard extends StatefulWidget {
  final Color themeColor;
  final int weekName;
  const DayCard({super.key, required this.themeColor, required this.weekName});

  @override
  State<DayCard> createState() => _DayCardState();
}

class _DayCardState extends State<DayCard> {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 320,
      color: const Color.fromRGBO(37, 37, 37, 1),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.all(3),
            padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            width: double.infinity,
            color: Colors.black,
            child: RichText(
              text: TextSpan(
                style: const TextStyle(
                    color: Color.fromRGBO(165, 165, 165, 1), fontSize: 14),
                children: [
                  const TextSpan(
                    text: "JAN : ",
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  TextSpan(text: "Week ${widget.weekName}"),
                ],
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                DayBanner(
                    colorState: 1,
                    showDate: DateTime(2023, 12, 25),
                    themeColor: widget.themeColor),
                DayBanner(
                  colorState: 0,
                  showDate: DateTime(2023, 12, 26),
                  themeColor: widget.themeColor,
                ),
                DayBanner(
                  colorState: 2,
                  showDate: DateTime(2023, 12, 27),
                  themeColor: widget.themeColor,
                ),
                DayBanner(
                  colorState: 3,
                  showDate: DateTime(2023, 12, 28),
                  themeColor: widget.themeColor,
                ),
                DayBanner(
                  colorState: 2,
                  showDate: DateTime(2023, 12, 29),
                  themeColor: widget.themeColor,
                ),
              ],
            ),
          )

          // Expanded(child: Row(mainAxisSize: MainAxisSize.min,))
        ],
      ),
    );
  }
}

class DayBanner extends StatelessWidget {
  final int colorState;
  final DateTime showDate;
  final Color themeColor;
  const DayBanner(
      {super.key,
      required this.colorState,
      required this.showDate,
      required this.themeColor});

  @override
  Widget build(BuildContext context) {
    final Color color;
    if (colorState < 2) {
      if (colorState == 1) {
        color = const Color.fromRGBO(99, 163, 67, 1);
      } else {
        color = const Color.fromRGBO(203, 83, 69, 1);
      }
      return Column(
        children: [
          Material(
            color: color,
            borderRadius: const BorderRadius.all(Radius.circular(6)),
            child: SplashOnPressed(
              splashColor: Colors.white30,
              radius: 6,
              onPressed: () {
                print("hello");
              },
              child: SizedBox(
                height: 32,
                width: 32,
                child: Center(
                  child: Text(
                    showDate.day.toString(),
                    style: const TextStyle(
                        fontSize: 14,
                        color: Colors.black,
                        fontWeight: FontWeight.w500),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(
            height: 4,
          ),
          Text(
            DateFormat('EEEE').format(showDate).substring(0, 3),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: color,
            ),
          )
        ],
      );
    } else {
      if (colorState == 2) {
        color = themeColor;
      } else {
        color = const Color.fromRGBO(71, 71, 71, 1);
      }
      return Column(
        children: [
          Container(
            height: 32,
            width: 32,
            decoration: BoxDecoration(
                borderRadius: const BorderRadius.all(Radius.circular(6)),
                border: Border.all(
                  color: color,
                  width: 1,
                )),
            child: Center(
              child: Text(
                showDate.day.toString(),
                style: TextStyle(
                  fontSize: 14,
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          const SizedBox(
            height: 4,
          ),
          Text(
            DateFormat('EEEE').format(showDate).substring(0, 3),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w400,
              color: color,
            ),
          )
        ],
      );
    }
  }
}
