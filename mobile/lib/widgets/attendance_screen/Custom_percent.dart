import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';

class MyCustomMarkPercentIndicator extends StatelessWidget {
   final int attendance;
    MyCustomMarkPercentIndicator({super.key, required this.attendance,});
   @override
  Widget build(BuildContext context) {
     double percentage=(attendance/30)*100;
     return Stack(
      alignment: Alignment.center,
      children: [
        CircularPercentIndicator(
          radius: 40,
          lineWidth: 6,
          fillColor: Colors.transparent,
          percent: percentage/100,
          circularStrokeCap: CircularStrokeCap.round,
          backgroundColor: Color.fromRGBO(201, 207, 123, 1),
          progressColor: Colors.black,
          center: Text(
            '$percentage%',
            style: TextStyle(
              color: Colors.black,
              fontWeight: FontWeight.bold,
              fontSize: 20.0,
            ),
          ),
          footer: Text(
            '$attendance/30',
            style: TextStyle(
              color: Colors.black,
              fontSize: 10,
            ),
          ),
        ),
        Transform.translate(
          offset: Offset(-37, -8),
          child: Container(
            height: 2,
            width: 6,
            color: Colors.black,
          ),
        ),
      ],
    );
  }
}