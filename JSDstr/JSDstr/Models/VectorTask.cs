﻿using System;
using System.Data.Linq.Mapping;

namespace JSDstr.Models
{
    public enum VectorTaskState
    {
        Idle = 0,
        Started = 1,
        Completed = 2,
        Cancelled = 3
    }

    [Table]
    public class VectorTask : BaseModel
    {
        [Column(IsPrimaryKey = true, IsDbGenerated = true)]
        public override int Id { get; set; }

        [Column]
        public override DateTime CreatedDate { get; set; }

        [Column]
        public override DateTime ChangedDate { get; set; }
        
        [Column]
        public int Vectorid { get; set; }

        [Column]
        public VectorTaskState State { get; set; }

        [Column]
        public CalculationState Type { get; set; }

        [Column]
        public Guid? SessionGuid { get; set; }

        [Column]
        public int CalculationId { get; set; }

        [Column]
        public int Iteration { get; set; }
    }
}